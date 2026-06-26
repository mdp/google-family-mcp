export const aboutSkill = `# Family MCP About

Use this skill before personalizing Family MCP workflows around the authenticated family member.

This server is a shared family MCP. Every authenticated family member may operate on every authorized family account. Use the current auth context and family profile to choose sensible defaults for account, timezone, and person references.

When a request names a family member, resolve them through the family profile roster before asking follow-up questions.
`;

export const familyGoogleSkill = `# Family MCP

Use this skill for family Gmail, Calendar, and Drive work.

Core rules:

- Use \`accounts_list\` to see which family accounts are authorized before broad cross-account work.
- Most tools accept \`account\`; pass the target family member email when operating on someone else's Gmail, Calendar, or Drive.
- Any family member can access any other authorized family member's account.
- For ambiguous names, resolve the person through the family roster and use their email.
- For calendar work, use the target member's timezone unless the user says otherwise.
- For outbound email and calendar invites, family members are always allowed recipients. Non-family recipients must match the external allowlist.

Account selection:

- If the user says "my", use the authenticated caller's account.
- If the user names another family member, use that member's email as \`account\`.
- If the user asks for "everyone", "family", or "all accounts", use the all-account tool when available, otherwise run account-specific tools once per authorized account.
`;

export const emailSearchSkill = `# Family Email Search

Use this skill before searching or reading family Gmail.

Workflow:

- For one named person, call \`gmail_search\` with that person's email as \`account\`.
- For broad family searches, call \`gmail_search_all\`.
- Preserve the returned \`account\` alongside each thread result. Thread IDs are only meaningful with the account they came from.
- To read a result from \`gmail_search_all\`, call \`gmail_get_thread\` with both \`thread_id\` and \`account\`.
- Prefer Gmail search syntax directly in \`query\`, such as \`from:\`, \`to:\`, \`subject:\`, \`newer_than:\`, \`older_than:\`, and quoted phrases.

Summaries should identify which family member's mailbox each result came from.
`;

export const calendarSkill = `# Family Calendar

Use this skill before checking schedules, creating events, updating events, or sending calendar invites for the family.

Workflow:

- Resolve named family members through the family roster.
- Use the target person's email as \`account\` when listing or changing their calendar.
- Use the target person's timezone as the default \`time_zone\` unless the user gives another timezone.
- Family members can invite each other without needing an external-recipient allowlist entry.
- Set \`send_updates: "all"\` when the user expects guests to receive invites or update notifications.
- For all-day events, set \`all_day: true\` and pass date strings.
- For meetings, set \`create_meet_link: true\` only when a video meeting is wanted.
`;
