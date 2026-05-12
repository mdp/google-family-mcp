// Identity-based access gates for google-family-mcp.
//
// All family members (ALLOWED_EMAILS) have symmetric access:
//   - Any member can operate tools on any other member's account.
//   - Outbound email and calendar invites are restricted to recipients that are
//     either in ALLOWED_EMAILS or in ALLOWED_EXTERNAL_RECIPIENTS.
//   - ALLOWED_EXTERNAL_RECIPIENTS accepts exact emails or domains (example.com).

function extractEmails(field: string): string[] {
  const matches = field.match(/[\w.+\-]+@[\w.\-]+/g);
  return matches ?? [];
}

export function parseAllowedList(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string, allowedEmails: string): boolean {
  if (!allowedEmails) return false;
  return parseAllowedList(allowedEmails).includes(email.toLowerCase());
}

function isPermittedRecipient(
  email: string,
  allowedEmails: string,
  allowedExternal: string,
): boolean {
  const normalEmail = email.toLowerCase();

  if (parseAllowedList(allowedEmails).includes(normalEmail)) return true;

  for (const entry of parseAllowedList(allowedExternal)) {
    if (entry.startsWith("@")) {
      if (normalEmail.endsWith(entry)) return true;
    } else if (entry.includes("@")) {
      if (normalEmail === entry) return true;
    } else {
      if (normalEmail.endsWith(`@${entry}`)) return true;
    }
  }

  return false;
}

export function assertRecipientsAllowed(
  opts: { to: string; cc?: string; bcc?: string },
  allowedEmails: string,
  allowedExternalRecipients: string,
): void {
  const allEmails: string[] = [];
  allEmails.push(...extractEmails(opts.to));
  if (opts.cc) allEmails.push(...extractEmails(opts.cc));
  if (opts.bcc) allEmails.push(...extractEmails(opts.bcc));

  if (allEmails.length === 0) {
    throw new Error("No valid recipient email addresses found.");
  }

  const blocked = allEmails.filter(
    (e) => !isPermittedRecipient(e, allowedEmails, allowedExternalRecipients),
  );
  if (blocked.length > 0) {
    throw new Error(`Recipients not on allowed list: ${blocked.join(", ")}`);
  }
}

export function assertAttendeesAllowed(
  attendees: (string | { email: string })[] | undefined,
  allowedEmails: string,
  allowedExternalRecipients: string,
): void {
  if (!attendees?.length) return;

  const blocked = attendees
    .map((a) => (typeof a === "string" ? a : a.email))
    .filter((e) => !isPermittedRecipient(e, allowedEmails, allowedExternalRecipients));

  if (blocked.length > 0) {
    throw new Error(`Attendees not on allowed list: ${blocked.join(", ")}`);
  }
}

// Any family member may operate on any other family member's account.
export function resolveTargetAccount(
  callerEmail: string,
  requestedAccount: string | undefined,
  allowedEmails: string,
): { ok: true; account: string } | { ok: false; error: string } {
  if (!requestedAccount || requestedAccount.toLowerCase() === callerEmail.toLowerCase()) {
    return { ok: true, account: callerEmail };
  }
  if (!isAllowedEmail(requestedAccount, allowedEmails)) {
    return { ok: false, error: `Account "${requestedAccount}" is not a family member.` };
  }
  return { ok: true, account: requestedAccount };
}
