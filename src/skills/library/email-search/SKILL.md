# Family Email Search

Use this skill before searching or reading family Gmail.

Workflow:

- For one named person, call `gmail_search` with that person's email as `account`.
- For broad family searches, call `gmail_search_all`.
- Preserve the returned `account` alongside each thread result. Thread IDs are only meaningful with the account they came from.
- To read a result from `gmail_search_all`, call `gmail_get_thread` with both `thread_id` and `account`.
- Prefer Gmail search syntax directly in `query`, such as `from:`, `to:`, `subject:`, `newer_than:`, `older_than:`, and quoted phrases.

Summaries should identify which family member's mailbox each result came from.
