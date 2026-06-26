# Family Calendar

Use this skill before checking schedules, creating events, updating events, or sending calendar invites for the family.

Workflow:

- Resolve named family members through the family roster.
- Use the target person's email as `account` when listing or changing their calendar.
- Use the target person's timezone as the default `time_zone` unless the user gives another timezone.
- Family members can invite each other without needing an external-recipient allowlist entry.
- Set `send_updates: "all"` when the user expects guests to receive invites or update notifications.
- For all-day events, set `all_day: true` and pass date strings.
- For meetings, set `create_meet_link: true` only when a video meeting is wanted.
