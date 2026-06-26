# Family MCP Settings

## My Environment - Read This Before Responding

My workspace may have the **Family MCP** connector attached. It is optional: use it when it is present, but do not assume it is always connected.

When the connector is present, it is the source of truth for my family's Gmail, Calendar, and Drive workflows. Its tools may load on demand and may not be visible at the start of a conversation, so search for them before using them. Tool names may shift slightly over time; match on what a tool does, not its exact name.

## How To Handle The Family MCP

- For family Gmail, Calendar, Drive, scheduling, invites, files, or account-status requests, first check whether the Family MCP is available by searching for its tools or a relevant skill.
- If the MCP is unavailable, proceed normally and mention the connector only when it would clearly have helped.
- When the MCP is present, prefer it over built-in or generic tools for private family account context.
- Load relevant skills before specialized workflows:
  - `about` for authenticated-user context.
  - `family-google` for cross-account Google work.
  - `email-search` for shared Gmail search/read tasks.
  - `calendar` for scheduling and invites.

## Family Access Model

Every authenticated family member can access every authorized family account through this MCP. There is no privacy partition between family members.

Family members may send email and calendar invites to each other. Non-family recipients must match the server's external recipient allowlist.

Use `account` to operate on a specific family member's Gmail, Calendar, or Drive. If a request asks for all family mailboxes, use `gmail_search_all`.

## Family Members

Family member profiles come from the server's `FAMILY_MEMBERS` environment variable. Configure it as a JSON array with `name`, `email`, `relationship`, and `timezone`.

| Name | Email | Relationship | Timezone |
| --- | --- | --- | --- |
| Adult 1 | adult1@example.com | adult | Etc/UTC |
| Adult 2 | adult2@example.com | adult | Etc/UTC |

If a task mentions a family member by name or relationship, use this roster to infer the email and timezone.
