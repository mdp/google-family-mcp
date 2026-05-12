import type { GoogleTokens, GoogleUserInfo } from "./types.js";

// ─── Storage Interface ────────────────────────────────────────────────────────

export interface Storage {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string }): Promise<{ keys: { name: string }[] }>;
}

// ─── Cloudflare KV Storage ────────────────────────────────────────────────────

export class CloudflareKVStorage implements Storage {
  constructor(private kv: KVNamespace) {}

  get(key: string): Promise<string | null> {
    return this.kv.get(key);
  }

  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    return this.kv.put(key, value, options);
  }

  delete(key: string): Promise<void> {
    return this.kv.delete(key);
  }

  async list(options: { prefix: string }): Promise<{ keys: { name: string }[] }> {
    return this.kv.list(options);
  }
}

// ─── In-Memory Storage (dev / testing) ───────────────────────────────────────

export class MemoryStorage implements Storage {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options: { prefix: string }): Promise<{ keys: { name: string }[] }> {
    const keys = [...this.store.keys()]
      .filter((k) => k.startsWith(options.prefix))
      .map((name) => ({ name }));
    return { keys };
  }
}

// ─── Token helpers ────────────────────────────────────────────────────────────

const TOKEN_PREFIX = "google:tokens:";
const USER_INFO_PREFIX = "user-info:";

export async function getTokens(storage: Storage, email: string): Promise<GoogleTokens | null> {
  const data = await storage.get(`${TOKEN_PREFIX}${email}`);
  if (!data) return null;
  return JSON.parse(data) as GoogleTokens;
}

export async function saveTokens(
  storage: Storage,
  email: string,
  tokens: GoogleTokens
): Promise<void> {
  await storage.put(`${TOKEN_PREFIX}${email}`, JSON.stringify(tokens));
}

export async function getUserInfoFromStorage(
  storage: Storage,
  email: string
): Promise<GoogleUserInfo | null> {
  const data = await storage.get(`${USER_INFO_PREFIX}${email}`);
  if (!data) return null;
  return JSON.parse(data) as GoogleUserInfo;
}

export async function saveUserInfo(
  storage: Storage,
  email: string,
  userInfo: GoogleUserInfo
): Promise<void> {
  await storage.put(`${USER_INFO_PREFIX}${email}`, JSON.stringify(userInfo));
}
