

## Tools

<!-- sigmap-tools -->

```json
[
  {
    "name": "sigmap_ask",
    "description": "Rank source files by relevance to a natural-language query. Run before exploring the codebase.",
    "command": "sigmap ask \"$QUERY\""
  },
  {
    "name": "sigmap_validate",
    "description": "Validate SigMap config and measure context coverage. Run after changing config or source dirs.",
    "command": "sigmap validate"
  },
  {
    "name": "sigmap_judge",
    "description": "Score an LLM response for groundedness against source context. Use to verify answer quality.",
    "command": "sigmap judge --response \"$RESPONSE\" --context \"$CONTEXT\""
  },
  {
    "name": "sigmap_query",
    "description": "Rank all files by relevance using TF-IDF and write a focused mini-context.",
    "command": "sigmap --query \"$QUERY\" --context"
  },
  {
    "name": "sigmap_weights",
    "description": "Show learned file-ranking multipliers accumulated from past sessions.",
    "command": "sigmap weights"
  }
]
```

## Auto-generated signatures
<!-- Updated by gen-context.js -->
# Code signatures

## SigMap commands

| When | Command |
|------|---------|
| Before answering a question | `sigmap ask "<your question>"` |
| After code changes | `sigmap validate` |
| To query by topic | `sigmap --query "<topic>"` |

Always run `sigmap ask` or `sigmap --query` before searching for files relevant to a task.
## deps
```
src/auth.ts ← types
src/calendar-service.ts ← google-client
src/drive-service.ts ← google-client
src/gmail-service.ts ← google-client
src/google-client.ts ← types, storage
src/mcp-server.ts ← env, storage, types, google-client, access-policy
src/oauth.ts ← env, storage, auth, access-policy, types
src/storage.ts ← types
```

## src

### src/access-policy.ts
```
export function parseAllowedList(csv) → string[]
export function isAllowedEmail(email, allowedEmails) → boolean
export function assertRecipientsAllowed(opts, allowedEmails, allowedExternalRecipients,) → void
export function resolveTargetAccount(callerEmail, requestedAccount, allowedEmails,)
```

### src/auth.ts
```
export async function signJWT(payload, secret) → Promise<string>
export async function verifyJWT(token, secret) → Promise<JWTPayload | null>
export function makeSessionCookie(token, secure) → string
export function clearSessionCookie(secure) → string
export function getJWTFromRequest(request) → string | null
export async function resolveAuth(request, jwtSecret,) → Promise<
```

### src/calendar-service.ts
```
export interface CalendarInfo
  id: string
  summary: string
  description: string | null
  timeZone: string | null
  accessRole: string | null
  primary: boolean
export interface CalendarEvent
  id: string
  summary: string | null
  start: string | null
  end: string | null
  location: string | null
  status: string | null
  creator: { email: string
  organizer: { email: string
export interface CalendarEventDetail
  id: string
  summary: string | null
  description: string | null
  start: string | null
  end: string | null
  startTimeZone: string | null
  endTimeZone: string | null
  location: string | null
```

### src/drive-service.ts
```
export interface DriveFile
  id: string
  name: string
  mimeType: string
  createdTime: string | null
  modifiedTime: string | null
  size: string | null
  parents: string[] | null
export async function driveListFiles(client, opts?,) → Promise<DriveFile[]>
export async function driveSearchFiles(client, opts,) → Promise<DriveFile[]>
export async function driveReadFile(client, opts,) → Promise<
export async function driveUploadFile(client, opts,) → Promise<DriveFile>
export async function driveCreateFolder(client, opts,) → Promise<DriveFile>
export async function driveGetFileBytes(client, opts,) → Promise<
```

### src/env.ts
```
export interface Env
  TOKENS_KV: KVNamespace
  STATE_KV: KVNamespace
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  JWT_SECRET: string
  ALLOWED_EMAILS: string
  ALLOWED_EXTERNAL_RECIPIENTS: string
  MCP_RATE_LIMITER: { limit(options: { key: string }): 
```

### src/gmail-service.ts
```
export interface GmailThreadSummary
  threadId: string
  subject: string
  from: string
  cc?: string
  bcc?: string
  date: string
  snippet: string
  messageCount: number
export interface GmailMessage
  messageId: string
  from: string
  to: string
  cc?: string
  bcc?: string
  date: string
  subject: string
  body: string
export interface GmailLabel
  id: string
  name: string
  type: string
export interface AttachmentMeta
  messageId: string
  attachmentId: string
```

### src/google-client.ts
```
export class GoogleClient
  constructor(tokens, private clientId, private clientSecret, private storage, private email)
  static async fromStorage(storage, email, clientId, clientSecret) → Promise<GoogleClient
  async ensureValidToken() → Promise<string>
  async request(method, url, body?, timeoutMs = 25000) → Promise<T>
  async getUserInfo() → Promise<GoogleUserIn
```

### src/mcp-server.ts
```
export function createMcpServer(storage, env, callerEmail) → McpServer
```

### src/oauth.ts
```
export function validateRedirectUri(uri)
export function registerOAuthRoutes(app, tokensStorage, stateStorage,) → void
```

### src/storage.ts
```
export interface Storage
  get(key)
  put(key, value, options?)
  delete(key)
  list(options)
export class CloudflareKVStorage
  constructor(private kv)
  get(key) → Promise<string | nul
  put(key, value, options?) → Promise<void>
  delete(key) → Promise<void>
  async list(options) → Promise<
export class MemoryStorage
  async get(key) → Promise<string | nul
  async put(key, value, options?) → Promise<void>
  async delete(key) → Promise<void>
  async list(options) → Promise<
export async function getTokens(storage, email) → Promise<GoogleTokens | null>
export async function saveTokens(storage, email, tokens) → Promise<void>
export async function getUserInfoFromStorage(storage, email) → Promise<GoogleUserInfo | null>
export async function saveUserInfo(storage, email, userInfo) → Promise<void>
```

### src/types.ts
```
export interface GoogleTokens
  access_token: string
  refresh_token: string
  expires_in: number
  expiry_date: number
  token_type: string
export interface GoogleUserInfo
  id: string
  email: string
  name: string
  picture?: string
  verified_email: boolean
export interface JWTPayload
  email: string
  iat?: number
  exp?: number
export interface AuthExtra
  email: string
```
