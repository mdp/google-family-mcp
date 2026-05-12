// ─── Google OAuth Tokens ──────────────────────────────────────────────────────

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expiry_date: number; // epoch ms
  token_type: string;
}

// ─── Google User Info ─────────────────────────────────────────────────────────

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JWTPayload {
  email: string;
  iat?: number;
  exp?: number;
}

// ─── Auth context passed into MCP tool handlers ───────────────────────────────

export interface AuthExtra {
  email: string;
}
