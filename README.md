# Family MCP

Family MCP is a Cloudflare Worker MCP server that lets a trusted family group use Gmail, Google Calendar, and Google Drive through Claude or another MCP client.

Each family member signs in with Google once. The server stores OAuth tokens in Cloudflare KV, and any authenticated family member can use the tools against any other authorized family member's account.

## Features

- Shared family Gmail search, thread reading, attachments, labels, drafts, sending, forwarding, and mark-read actions.
- `gmail_search_all` for searching every authorized family mailbox at once.
- Shared Google Calendar listing, event details, creation, updates, deletion, recurring events, reminders, and Meet links.
- Shared Google Drive listing, search, text export, byte download, upload, and folder creation.
- Static MCP skills for family account context, email search, calendar work, and cross-account workflows.
- Symmetric family access: everyone in `ALLOWED_EMAILS` can operate on every authorized account.
- Outbound email and calendar invite guardrails: family recipients are always allowed; non-family recipients must match `ALLOWED_EXTERNAL_RECIPIENTS`.

## Tools

| Tool | Description |
|---|---|
| `accounts_list` | List family accounts that have authorized the server |
| `skills_list` | List built-in Family MCP skills |
| `skills_get` | Load a built-in skill as markdown |
| `gmail_search` | Search one family member's Gmail |
| `gmail_search_all` | Search Gmail across all family accounts |
| `gmail_get_thread` | Read a full thread with decoded bodies |
| `gmail_get_attachment` | Fetch an attachment as base64 |
| `gmail_create_draft` | Save a draft without sending |
| `gmail_send` | Send or reply with markdown converted to text and HTML |
| `gmail_forward` | Forward a message |
| `gmail_list_labels` | List Gmail labels |
| `gmail_mark_read` | Mark messages or threads as read |
| `calendar_list` | List accessible calendars |
| `calendar_list_events` | Query events with filters |
| `calendar_get_event` | Get event details including attendees and Meet links |
| `calendar_create_event` | Create events with recurrence, reminders, attendees, and Meet links |
| `calendar_update_event` | Update an existing event |
| `calendar_delete_event` | Delete an event |
| `drive_list_files` | List files in a Drive folder |
| `drive_search_files` | Search Drive with query syntax |
| `drive_read_file` | Read Docs, Sheets, and Slides as text |
| `drive_get_file_bytes` | Download a file as base64 |
| `drive_upload_file` | Upload a new text file |
| `drive_create_folder` | Create a folder |

Most Google tools accept `account`, a family member email. Omit it to use the authenticated caller's account.

## Privacy And Configuration

Do not commit real family names, email addresses, relationships, timezones, OAuth secrets, or KV namespace IDs to a public repository.

Private family data belongs in environment configuration:

- `ALLOWED_EMAILS`: comma-separated emails allowed to sign in.
- `FAMILY_MEMBERS`: JSON array of profile metadata used by skills and account listings.
- `ALLOWED_EXTERNAL_RECIPIENTS`: optional comma-separated exact emails or domains allowed for non-family outbound mail and calendar invites.

Example `FAMILY_MEMBERS`:

```json
[
  {
    "name": "Adult 1",
    "email": "adult1@example.com",
    "relationship": "adult",
    "timezone": "Etc/UTC"
  },
  {
    "name": "Adult 2",
    "email": "adult2@example.com",
    "relationship": "adult",
    "timezone": "Etc/UTC"
  }
]
```

If `FAMILY_MEMBERS` is empty or invalid, Family MCP derives minimal profiles from `ALLOWED_EMAILS` with relationship `family` and timezone `UTC`.

## Deploy

### Prerequisites

- Node.js 18+
- pnpm
- A Cloudflare account
- A Google Cloud project with Gmail API, Google Calendar API, and Google Drive API enabled

## GitHub Deploys To Cloudflare

This repo includes GitHub Actions for CI and Cloudflare Worker deployment:

- `.github/workflows/ci.yml` runs typecheck, tests, and audit on pull requests and pushes to `main`.
- `.github/workflows/deploy-cloudflare.yml` deploys to Cloudflare on pushes to `main` and can also be run manually.

The deploy workflow generates `wrangler.ci.jsonc` at runtime from GitHub configuration, so Cloudflare IDs and family data do not need to be committed.

### GitHub Repository Variables

Set these in GitHub: `Settings -> Secrets and variables -> Actions -> Variables`.

| Variable | Required | Description |
|---|---:|---|
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `FAMILY_MCP_STATE_KV_NAMESPACE_ID` | Yes | KV namespace ID for OAuth/session state |
| `FAMILY_MCP_TOKENS_KV_NAMESPACE_ID` | Yes | KV namespace ID for Google OAuth tokens |
| `FAMILY_MCP_RATE_LIMIT_NAMESPACE_ID` | Yes | Cloudflare Workers rate-limit namespace ID |
| `FAMILY_MCP_WORKER_NAME` | No | Worker name, defaults to `family-mcp` |
| `FAMILY_MCP_WORKERS_DEV` | No | Set to `false` when deploying only to a custom domain |
| `FAMILY_MCP_CUSTOM_DOMAIN` | No | Custom Worker route, for example `mcp.example.com` |

### GitHub Repository Secrets

Set these in GitHub: `Settings -> Secrets and variables -> Actions -> Secrets`.

| Secret | Required | Description |
|---|---:|---|
| `CLOUDFLARE_API_TOKEN` | Yes | Cloudflare API token with permission to deploy Workers and read KV/rate-limit resources |

GitHub does not store application secrets. Runtime configuration belongs on Cloudflare.

### Cloudflare Worker Secrets

Set these directly on the Cloudflare Worker, either with `wrangler secret put <NAME>` or in the Cloudflare dashboard.

| Secret | Required | Description |
|---|---:|---|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `JWT_SECRET` | Yes | Random JWT signing secret |
| `ALLOWED_EMAILS` | Yes | Comma-separated family emails allowed to sign in |
| `FAMILY_MEMBERS` | No | JSON family profile array; if omitted, minimal profiles are derived from `ALLOWED_EMAILS` |
| `ALLOWED_EXTERNAL_RECIPIENTS` | No | Comma-separated non-family emails/domains allowed for outbound mail and invites |

For first-time setup, create the two KV namespaces and rate-limit namespace before enabling the deploy workflow. Then add the returned IDs as GitHub Variables and set the runtime secrets on Cloudflare.

### 1. Create Google OAuth Credentials

1. In Google Cloud Console, create an OAuth 2.0 Client ID for a web application.
2. Add this authorized redirect URI:

```text
https://<your-worker-name>.<your-subdomain>.workers.dev/oauth/callback
```

For local development, also add:

```text
http://localhost:8788/oauth/callback
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Create Cloudflare KV Namespaces

```bash
npx wrangler kv namespace create STATE_KV
npx wrangler kv namespace create TOKENS_KV
```

Put the returned IDs into `wrangler.jsonc`.

### 4. Prepare Runtime Values

For open-source forks, keep `wrangler.jsonc` generic and keep real runtime values out of git. Use `.env` as your local/private reference file:

```bash
cp .env.example .env
```

### 5. Set Cloudflare Worker Secrets

For Cloudflare deployments, store real runtime values directly on the Worker:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put ALLOWED_EMAILS
npx wrangler secret put FAMILY_MEMBERS
npx wrangler secret put ALLOWED_EXTERNAL_RECIPIENTS
```

`FAMILY_MEMBERS` and `ALLOWED_EXTERNAL_RECIPIENTS` are optional.

Generate `JWT_SECRET` with:

```bash
openssl rand -hex 32
```

### 6. Deploy

```bash
pnpm deploy
```

Wrangler prints the deployed URL, for example:

```text
https://family-mcp.<subdomain>.workers.dev
```

### 7. Authorize Each Family Member

Each person in `ALLOWED_EMAILS` visits:

```text
https://family-mcp.<subdomain>.workers.dev/oauth/authorize
```

After Google OAuth, `/auth/status` shows the MCP server URL.

### 8. Connect Your MCP Client

Use the server URL:

```text
https://family-mcp.<subdomain>.workers.dev/mcp
```

Example Claude Desktop config:

```json
{
  "mcpServers": {
    "family": {
      "url": "https://family-mcp.<subdomain>.workers.dev/mcp"
    }
  }
}
```

## Local Development

```bash
cp .env.example .env
pnpm dev
```

The worker runs at `http://localhost:8788`.

## Access Policy

- Only emails listed in `ALLOWED_EMAILS` can authenticate.
- Any authenticated family member can operate on any authorized family account.
- `gmail_send`, `gmail_forward`, `calendar_create_event`, and `calendar_update_event` restrict outbound recipients to family members plus `ALLOWED_EXTERNAL_RECIPIENTS`.
- Rate limit: 60 requests per 10 seconds per authenticated user.

## License

MIT
