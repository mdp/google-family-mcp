# Family MCP

Use this skill for family Gmail, Calendar, and Drive work.

Core rules:

- Use `accounts_list` to see which family accounts are authorized before broad cross-account work.
- Most tools accept `account`; pass the target family member email when operating on someone else's Gmail, Calendar, or Drive.
- Any family member can access any other authorized family member's account.
- For ambiguous names, resolve the person through the family roster and use their email.
- For calendar work, use the target member's timezone unless the user says otherwise.
- For outbound email and calendar invites, family members are always allowed recipients. Non-family recipients must match the external allowlist.

Account selection:

- If the user says "my", use the authenticated caller's account.
- If the user names another family member, use that member's email as `account`.
- If the user asks for "everyone", "family", or "all accounts", use the all-account tool when available, otherwise run account-specific tools once per authorized account.
