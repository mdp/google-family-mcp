import type { Hono } from "hono";
import type { Env } from "./env.js";
import type { Storage } from "./storage.js";
import { saveTokens, saveUserInfo } from "./storage.js";
import { signJWT, makeSessionCookie } from "./auth.js";
import { isAllowedEmail } from "./access-policy.js";
import type { GoogleTokens, GoogleUserInfo } from "./types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
].join(" ");

// ─── Internal types ───────────────────────────────────────────────────────────

type OAuthState =
  | { type: "direct" }
  | {
      type: "mcp";
      clientId: string;
      redirectUri: string;
      codeChallenge: string;
      codeChallengeMethod: string;
      clientState?: string;
      scope?: string;
    };

type AuthCodeData = {
  email: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
};

type RegisteredClient = {
  client_id: string;
  client_id_issued_at: number;
  redirect_uris: string[];
  client_name?: string;
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — family-mcp</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 20px;color:#333}
  h1{font-size:1.4em}a{color:#2563eb}
  pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;font-size:0.85em}
  .btn{display:inline-block;padding:9px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-size:0.9em}
</style>
</head><body><h1>${title}</h1>${body}</body></html>`;
}

function baseUrl(reqUrl: string): string {
  const u = new URL(reqUrl);
  return `${u.protocol}//${u.host}`;
}

function callbackUrl(reqUrl: string): string {
  const u = new URL(reqUrl);
  u.pathname = "/oauth/callback";
  u.search = "";
  return u.toString();
}

function parseOAuthState(raw: string): OAuthState {
  if (raw === "pending") return { type: "direct" };
  try {
    return JSON.parse(raw) as OAuthState;
  } catch {
    return { type: "direct" };
  }
}

async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function corsAllowOrigin(origin: string | null): string | null {
  if (!origin) return null;
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return null;
  }
  if (u.protocol === "https:") return origin;
  if (u.protocol === "http:" && LOOPBACK_HOSTS.has(u.hostname)) return origin;
  return null;
}

function setCors(c: { req: { header: (k: string) => string | undefined }; header: (k: string, v: string) => void }): void {
  const allow = corsAllowOrigin(c.req.header("origin") ?? null);
  if (allow) {
    c.header("Access-Control-Allow-Origin", allow);
    c.header("Vary", "Origin");
  }
}

export function validateRedirectUri(uri: string): { ok: true } | { ok: false; reason: string } {
  if (typeof uri !== "string" || uri.length === 0) {
    return { ok: false, reason: "redirect_uri must be a non-empty string" };
  }
  if (uri.length > 2048) {
    return { ok: false, reason: "redirect_uri exceeds 2048 characters" };
  }
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return { ok: false, reason: "redirect_uri is not a valid URL" };
  }
  if (u.hash !== "") {
    return { ok: false, reason: "redirect_uri must not contain a fragment" };
  }
  if (u.protocol === "https:") return { ok: true };
  if (u.protocol === "http:" && LOOPBACK_HOSTS.has(u.hostname)) return { ok: true };
  return { ok: false, reason: "redirect_uri must use https:// or http:// loopback (localhost/127.0.0.1/[::1])" };
}

// ─── OAuth route registration ──────────────────────────────────────────────────

export function registerOAuthRoutes(
  app: Hono<{ Bindings: Env }>,
  tokensStorage: Storage,
  stateStorage: Storage,
): void {

  // ── RFC 8414 / RFC 9728 discovery ──────────────────────────────────────────

  app.get("/.well-known/oauth-authorization-server", (c) => {
    const base = baseUrl(c.req.url);
    c.header("Access-Control-Allow-Origin", "*");
    return c.json({
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      registration_endpoint: `${base}/register`,
      response_types_supported: ["code"],
      code_challenge_methods_supported: ["S256"],
      grant_types_supported: ["authorization_code"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
      scopes_supported: ["mcp:tools"],
    });
  });

  app.get("/.well-known/oauth-protected-resource", (c) => {
    const base = baseUrl(c.req.url);
    c.header("Access-Control-Allow-Origin", "*");
    return c.json({
      resource: base,
      authorization_servers: [base],
      scopes_supported: ["mcp:tools"],
    });
  });

  // ── Dynamic client registration (RFC 7591) ─────────────────────────────────

  app.options("/register", (c) => {
    setCors(c);
    c.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return c.body(null, 204);
  });

  app.post("/register", async (c) => {
    setCors(c);
    c.header("Cache-Control", "no-store");

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_client_metadata", error_description: "Invalid JSON body" }, 400);
    }

    const redirectUris = body["redirect_uris"];
    if (
      !Array.isArray(redirectUris) ||
      redirectUris.length === 0 ||
      !redirectUris.every((u) => typeof u === "string")
    ) {
      return c.json({ error: "invalid_client_metadata", error_description: "redirect_uris is required" }, 400);
    }
    for (const uri of redirectUris as string[]) {
      const check = validateRedirectUri(uri);
      if (!check.ok) {
        return c.json({ error: "invalid_redirect_uri", error_description: check.reason }, 400);
      }
    }

    const clientId = crypto.randomUUID();
    const issuedAt = Math.floor(Date.now() / 1000);
    const client: RegisteredClient = {
      client_id: clientId,
      client_id_issued_at: issuedAt,
      redirect_uris: redirectUris as string[],
      ...(typeof body["client_name"] === "string" ? { client_name: body["client_name"] } : {}),
      token_endpoint_auth_method:
        typeof body["token_endpoint_auth_method"] === "string"
          ? body["token_endpoint_auth_method"]
          : "client_secret_post",
      grant_types: Array.isArray(body["grant_types"])
        ? (body["grant_types"] as string[])
        : ["authorization_code"],
      response_types: Array.isArray(body["response_types"])
        ? (body["response_types"] as string[])
        : ["code"],
    };

    await stateStorage.put(`mcp:client:${clientId}`, JSON.stringify(client), {
      expirationTtl: 90 * 24 * 60 * 60,
    });

    return c.json(client, 201);
  });

  // ── /authorize — MCP OAuth AS authorization endpoint ──────────────────────

  app.get("/authorize", async (c) => {
    const responseType = c.req.query("response_type");
    const clientId = c.req.query("client_id");
    const redirectUri = c.req.query("redirect_uri");
    const codeChallenge = c.req.query("code_challenge");
    const codeChallengeMethod = c.req.query("code_challenge_method") ?? "S256";
    const clientState = c.req.query("state");
    const scope = c.req.query("scope");

    if (responseType !== "code") {
      return c.html(htmlPage("Error", "<p>Only <code>response_type=code</code> is supported.</p>"), 400);
    }
    if (!clientId) {
      return c.html(htmlPage("Error", "<p>Missing <code>client_id</code>.</p>"), 400);
    }
    if (!redirectUri) {
      return c.html(htmlPage("Error", "<p>Missing <code>redirect_uri</code>.</p>"), 400);
    }
    if (!codeChallenge) {
      return c.html(htmlPage("Error", "<p>Missing <code>code_challenge</code> (PKCE required).</p>"), 400);
    }

    const clientJson = await stateStorage.get(`mcp:client:${clientId}`);
    if (!clientJson) {
      return c.html(htmlPage("Error", "<p>Unknown <code>client_id</code>.</p>"), 400);
    }
    const registeredClient = JSON.parse(clientJson) as RegisteredClient;
    if (!registeredClient.redirect_uris.includes(redirectUri)) {
      return c.html(htmlPage("Error", "<p><code>redirect_uri</code> is not registered for this client.</p>"), 400);
    }

    const googleState = crypto.randomUUID();
    const mcpStatePayload: OAuthState = {
      type: "mcp",
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      ...(clientState ? { clientState } : {}),
      ...(scope ? { scope } : {}),
    };
    await stateStorage.put(`oauth:state:${googleState}`, JSON.stringify(mcpStatePayload), { expirationTtl: 600 });

    const googleUrl = new URL(GOOGLE_AUTH_URL);
    googleUrl.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
    googleUrl.searchParams.set("redirect_uri", callbackUrl(c.req.url));
    googleUrl.searchParams.set("response_type", "code");
    googleUrl.searchParams.set("scope", GOOGLE_SCOPES);
    googleUrl.searchParams.set("state", googleState);
    googleUrl.searchParams.set("access_type", "offline");
    googleUrl.searchParams.set("prompt", "consent");
    return c.redirect(googleUrl.toString(), 302);
  });

  // ── /token — MCP OAuth AS token endpoint ──────────────────────────────────

  app.options("/token", (c) => {
    setCors(c);
    c.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return c.body(null, 204);
  });

  app.post("/token", async (c) => {
    setCors(c);
    c.header("Cache-Control", "no-store");

    const rawBody = await c.req.parseBody().catch(() => ({}) as Record<string, string | File>);
    const str = (k: string) => (typeof rawBody[k] === "string" ? (rawBody[k] as string) : undefined);
    const grantType = str("grant_type");

    if (grantType !== "authorization_code") {
      return c.json({ error: "unsupported_grant_type" }, 400);
    }

    const code = str("code");
    const redirectUri = str("redirect_uri");
    const codeVerifier = str("code_verifier");
    const clientId = str("client_id");

    if (!code || !redirectUri || !codeVerifier || !clientId) {
      return c.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        400,
      );
    }

    const codeJson = await stateStorage.get(`mcp:code:${code}`);
    if (!codeJson) {
      return c.json(
        { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
        400,
      );
    }
    await stateStorage.delete(`mcp:code:${code}`);

    const codeData = JSON.parse(codeJson) as AuthCodeData;

    if (codeData.clientId !== clientId) {
      return c.json({ error: "invalid_grant", error_description: "client_id mismatch" }, 400);
    }
    if (codeData.redirectUri !== redirectUri) {
      return c.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, 400);
    }

    const computed = await pkceChallenge(codeVerifier);
    if (computed !== codeData.codeChallenge) {
      return c.json(
        { error: "invalid_grant", error_description: "code_verifier does not match code_challenge" },
        400,
      );
    }

    const jwt = await signJWT({ email: codeData.email }, c.env.JWT_SECRET);

    return c.json({
      access_token: jwt,
      token_type: "bearer",
      expires_in: 90 * 24 * 60 * 60,
      scope: "mcp:tools",
    });
  });

  // ── /oauth/authorize — direct browser login via Google ────────────────────

  app.get("/oauth/authorize", async (c) => {
    const state = crypto.randomUUID();
    await stateStorage.put(
      `oauth:state:${state}`,
      JSON.stringify({ type: "direct" }),
      { expirationTtl: 600 },
    );

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", callbackUrl(c.req.url));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_SCOPES);
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return c.redirect(url.toString(), 302);
  });

  // ── /oauth/callback — Google OAuth callback (shared by both flows) ─────────

  app.get("/oauth/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.html(
        htmlPage(
          "Authorization Failed",
          `<p>Google returned an error: <strong>${escapeHtml(error)}</strong></p><p><a href="/oauth/authorize">Try again</a></p>`,
        ),
        400,
      );
    }

    if (!code || !state) {
      return c.html(
        htmlPage("Error", "<p>Missing code or state parameter.</p><p><a href='/oauth/authorize'>Try again</a></p>"),
        400,
      );
    }

    const storedRaw = await stateStorage.get(`oauth:state:${state}`);
    if (!storedRaw) {
      return c.html(
        htmlPage("Error", "<p>Invalid or expired state. Please try again.</p><p><a href='/oauth/authorize'>Try again</a></p>"),
        400,
      );
    }
    await stateStorage.delete(`oauth:state:${state}`);

    const oauthState = parseOAuthState(storedRaw);

    // Exchange Google code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl(c.req.url),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return c.html(
        htmlPage(
          "Token Exchange Failed",
          `<p>Could not exchange authorization code.</p><pre>${escapeHtml(text)}</pre><p><a href='/oauth/authorize'>Try again</a></p>`,
        ),
        500,
      );
    }

    const rawTokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    };

    if (oauthState.type === "direct" && !rawTokens.refresh_token) {
      return c.html(
        htmlPage(
          "No Refresh Token",
          `<p>Google did not return a refresh token.</p>
           <p>Please <a href="https://myaccount.google.com/permissions" target="_blank">revoke access</a> for this app, then <a href="/oauth/authorize">try again</a>.</p>`,
        ),
        500,
      );
    }

    // Fetch user info
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${rawTokens.access_token}` },
    });
    if (!userRes.ok) {
      return c.html(
        htmlPage("Error", "<p>Failed to fetch your Google profile.</p><p><a href='/oauth/authorize'>Try again</a></p>"),
        500,
      );
    }
    const user = (await userRes.json()) as GoogleUserInfo;
    console.log(
      `Google OAuth callback flow=${oauthState.type} email=${user.email} refresh_token=${rawTokens.refresh_token ? "present" : "missing"} expires_in=${rawTokens.expires_in}`,
    );

    // Email whitelist check
    if (!isAllowedEmail(user.email, c.env.ALLOWED_EMAILS)) {
      if (oauthState.type === "mcp") {
        const errUrl = new URL(oauthState.redirectUri);
        errUrl.searchParams.set("error", "access_denied");
        errUrl.searchParams.set("error_description", "Your account is not authorized.");
        if (oauthState.clientState) errUrl.searchParams.set("state", oauthState.clientState);
        return c.redirect(errUrl.toString(), 302);
      }
      return c.html(
        htmlPage(
          "Access Denied",
          `<p>Your account (<strong>${escapeHtml(user.email)}</strong>) is not authorized to use this server.</p>`,
        ),
        403,
      );
    }

    if (oauthState.type === "mcp") {
      await saveUserInfo(tokensStorage, user.email, user);
      if (rawTokens.refresh_token) {
        await saveTokens(tokensStorage, user.email, {
          access_token: rawTokens.access_token,
          refresh_token: rawTokens.refresh_token,
          expires_in: rawTokens.expires_in,
          expiry_date: Date.now() + rawTokens.expires_in * 1000,
          token_type: rawTokens.token_type,
          obtained_at: Date.now(),
        });
      }

      const authCode = crypto.randomUUID();
      const codeData: AuthCodeData = {
        email: user.email,
        clientId: oauthState.clientId,
        redirectUri: oauthState.redirectUri,
        codeChallenge: oauthState.codeChallenge,
        codeChallengeMethod: oauthState.codeChallengeMethod,
      };
      await stateStorage.put(`mcp:code:${authCode}`, JSON.stringify(codeData), { expirationTtl: 60 });

      const redirectUrl = new URL(oauthState.redirectUri);
      redirectUrl.searchParams.set("code", authCode);
      if (oauthState.clientState) {
        redirectUrl.searchParams.set("state", oauthState.clientState);
      }
      return c.redirect(redirectUrl.toString(), 302);
    }

    // Direct browser flow: save tokens + set session cookie.
    await Promise.all([
      saveTokens(tokensStorage, user.email, {
        access_token: rawTokens.access_token,
        refresh_token: rawTokens.refresh_token!,
        expires_in: rawTokens.expires_in,
        expiry_date: Date.now() + rawTokens.expires_in * 1000,
        token_type: rawTokens.token_type,
        obtained_at: Date.now(),
      }),
      saveUserInfo(tokensStorage, user.email, user),
    ]);

    const jwt = await signJWT({ email: user.email }, c.env.JWT_SECRET);
    const isSecure = new URL(c.req.url).protocol === "https:";
    c.header("Set-Cookie", makeSessionCookie(jwt, isSecure));

    return c.html(
      htmlPage(
        "Signed In",
        `<p>Welcome, <strong>${escapeHtml(user.name)}</strong>!</p>
         <p>Signed in as <strong>${escapeHtml(user.email)}</strong>.</p>
         <p><a class="btn" href="/auth/status">View Status</a></p>`,
      ),
    );
  });
}
