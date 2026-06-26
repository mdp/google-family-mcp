// Cloudflare Worker environment bindings
export interface Env {
  // KV namespace for all token + user storage
  TOKENS_KV: KVNamespace;

  // KV namespace for OAuth state (CSRF protection, short TTL)
  STATE_KV: KVNamespace;

  // Google OAuth credentials (set via wrangler secret put)
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // JWT signing secret (set via wrangler secret put)
  // Generate with: openssl rand -hex 32
  JWT_SECRET: string;

  // Comma-separated list of allowed family member email addresses.
  // Only these accounts may log in and use tools.
  ALLOWED_EMAILS: string;

  // JSON array of family member profiles: name, email, relationship, timezone.
  // Emails should correspond to ALLOWED_EMAILS. If unset or invalid, profiles are
  // derived from ALLOWED_EMAILS with relationship "family" and timezone "UTC".
  FAMILY_MEMBERS?: string;

  // Comma-separated allowed external recipients for outbound email and calendar invites.
  // Supports exact emails (user@example.com) or domains (example.com / @example.com).
  // Family members from ALLOWED_EMAILS are always implicitly allowed.
  ALLOWED_EXTERNAL_RECIPIENTS?: string;

  // Per-identity rate limit for /mcp (defined in wrangler.jsonc as unsafe binding).
  MCP_RATE_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> };
}
