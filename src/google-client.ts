import type { GoogleTokens, GoogleUserInfo } from "./types.js";
import type { Storage } from "./storage.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// Refresh access token 5 minutes before expiry
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export class GoogleClient {
  private tokens: GoogleTokens;

  constructor(
    tokens: GoogleTokens,
    private clientId: string,
    private clientSecret: string,
    private storage: Storage,
    private email: string
  ) {
    this.tokens = { ...tokens };
  }

  static async fromStorage(
    storage: Storage,
    email: string,
    clientId: string,
    clientSecret: string
  ): Promise<GoogleClient | null> {
    const stored = await storage.get(`google:tokens:${email}`);
    if (!stored) return null;
    const tokens = JSON.parse(stored) as GoogleTokens;
    return new GoogleClient(tokens, clientId, clientSecret, storage, email);
  }

  async ensureValidToken(): Promise<string> {
    if (Date.now() < this.tokens.expiry_date - EXPIRY_BUFFER_MS) {
      return this.tokens.access_token;
    }

    if (!this.tokens.refresh_token) {
      throw new Error("No refresh token available. User may need to re-authorize.");
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.tokens.refresh_token,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      console.error(`Token refresh failed: ${response.status}`);
      throw new Error(
        `Google token refresh failed (${response.status}). The user may need to re-authorize at /oauth/authorize.`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    this.tokens.access_token = data.access_token;
    this.tokens.expiry_date = Date.now() + data.expires_in * 1000;
    if (data.refresh_token) {
      this.tokens.refresh_token = data.refresh_token;
    }

    await this.storage.put(`google:tokens:${this.email}`, JSON.stringify(this.tokens));

    return this.tokens.access_token;
  }

  async request<T>(method: string, url: string, body?: unknown, timeoutMs = 25000): Promise<T> {
    const token = await this.ensureValidToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let path = url;
      try {
        path = new URL(url).pathname;
      } catch {
        // leave as-is if not a valid URL
      }
      console.error(`Google API error (${response.status}): ${path}`);
      throw new Error(`Google API request failed (${response.status}).`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async getUserInfo(): Promise<GoogleUserInfo> {
    const token = await this.ensureValidToken();
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    return response.json() as Promise<GoogleUserInfo>;
  }
}
