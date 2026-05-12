# google-family-mcp

A Model Context Protocol (MCP) server that gives Claude (or any MCP client) access to your family's Gmail, Google Calendar, and Google Drive accounts. Runs as a Cloudflare Worker with OAuth-based login — each family member signs in once, and the server stores their tokens in Cloudflare KV.

## Tools

| Tool | Description |
|---|---|
| `accounts_list` | List which family accounts have authorized the server |
| `gmail_search` | Search Gmail threads |
| `gmail_get_thread` | Read a full thread with decoded bodies |
| `gmail_get_attachment` | Fetch an attachment as base64 |
| `gmail_create_draft` | Save a draft (not sent) |
| `gmail_send` | Send or reply — markdown body, sent as HTML+plain |
| `gmail_forward` | Forward a message |
| `gmail_list_labels` | List Gmail labels |
| `gmail_mark_read` | Mark messages/threads as read |
| `calendar_list` | List accessible calendars |
| `calendar_list_events` | Query events with full filter support |
| `calendar_get_event` | Get event details including Meet links |
| `calendar_create_event` | Create events with recurrence, reminders, Meet |
| `calendar_update_event` | Update an existing event |
| `calendar_delete_event` | Delete an event |
| `drive_list_files` | List files in a Drive folder |
| `drive_search_files` | Search Drive with query syntax |
| `drive_read_file` | Read Docs/Sheets/Slides as text |
| `drive_get_file_bytes` | Download a file as base64 |
| `drive_upload_file` | Upload a new text file |
| `drive_create_folder` | Create a folder |

Any family member can pass `account: "other@gmail.com"` to operate on another member's data (as long as that account has authorized the server).

## Deploy

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- A Google Cloud project with the Gmail, Calendar, and Drive APIs enabled

### 1. Create Google OAuth credentials

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (type: Web application).
3. Under **Authorized redirect URIs**, add:
   ```
   https://<your-worker-name>.<your-subdomain>.workers.dev/oauth/callback
   ```
4. Note the **Client ID** and **Client Secret**.

Enable these APIs in your project:
- Gmail API
- Google Calendar API
- Google Drive API

### 2. Install dependencies

```bash
pnpm install
```

### 3. Log in to Cloudflare

```bash
npx wrangler login
```

### 4. Create KV namespaces

```bash
npx wrangler kv namespace create STATE_KV
npx wrangler kv namespace create TOKENS_KV
```

Each command prints an `id`. Open `wrangler.jsonc` and replace the two `TODO_CREATE_NEW_KV_NAMESPACE` placeholders with the returned IDs.

### 5. Configure allowed accounts

In `wrangler.jsonc`, update the `vars` section:

```jsonc
"vars": {
  // Comma-separated family member emails — only these can log in
  "ALLOWED_EMAILS": "you@gmail.com,spouse@gmail.com",

  // Optional: extra recipients allowed for send/forward/invites
  // Supports exact emails or whole domains (e.g. "school.edu")
  "ALLOWED_EXTERNAL_RECIPIENTS": ""
}
```

### 6. Set secrets

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET   # generate: openssl rand -hex 32
```

### 7. Deploy

```bash
pnpm deploy
```

Wrangler prints the deployed URL, e.g. `https://google-family-mcp.<subdomain>.workers.dev`.

### 8. Authorize each family member

Each person in `ALLOWED_EMAILS` visits the worker URL and signs in:

```
https://google-family-mcp.<subdomain>.workers.dev/oauth/authorize
```

After completing the Google OAuth flow they land on `/auth/status`, which shows their MCP server URL.

### 9. Connect your MCP client

Add the server to your Claude Desktop (or other MCP client) config. Each user connects with their own session cookie in the browser, or by pointing their client at:

```
https://google-family-mcp.<subdomain>.workers.dev/mcp
```

For Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "google-family": {
      "url": "https://google-family-mcp.<subdomain>.workers.dev/mcp"
    }
  }
}
```

## Local development

```bash
pnpm dev
```

The server runs at `http://localhost:8788`. OAuth redirect URIs must include `http://localhost:8788/oauth/callback` in your Google Cloud credentials for local testing.

## Access policy

- Only emails listed in `ALLOWED_EMAILS` can authenticate.
- `gmail_send`, `gmail_forward`, `calendar_create_event`, and `calendar_update_event` enforce an outbound recipient allowlist. Recipients must be family members or match `ALLOWED_EXTERNAL_RECIPIENTS`. This prevents the server from being used to send arbitrary email.
- Rate limit: 60 requests per 10 seconds per authenticated user.
