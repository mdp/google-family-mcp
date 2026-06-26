export interface FamilyProfile {
  id: string;
  name: string;
  email: string;
  relationship: string;
  timezone: string;
}

type FamilyProfileInput = Omit<FamilyProfile, "id"> & { id?: string };

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function compact(value: string): string {
  return normalized(value).replace(/[^a-z0-9]/g, "");
}

function deriveName(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  return localPart
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || email;
}

function deriveId(input: FamilyProfileInput): string {
  return compact(input.id ?? input.name ?? input.email);
}

function fallbackProfiles(allowedEmails: string): FamilyProfile[] {
  return allowedEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .map((email) => ({
      id: compact(email.split("@")[0] ?? email),
      name: deriveName(email),
      email,
      relationship: "family",
      timezone: "UTC",
    }));
}

function isFamilyProfileInput(value: unknown): value is FamilyProfileInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.relationship === "string" &&
    typeof candidate.timezone === "string" &&
    (candidate.id === undefined || typeof candidate.id === "string")
  );
}

export function parseFamilyProfiles(rawProfiles: string | undefined, allowedEmails: string): FamilyProfile[] {
  if (!rawProfiles?.trim()) return fallbackProfiles(allowedEmails);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawProfiles);
  } catch {
    return fallbackProfiles(allowedEmails);
  }

  if (!Array.isArray(parsed)) return fallbackProfiles(allowedEmails);

  const profiles = parsed
    .filter(isFamilyProfileInput)
    .map((input) => ({
      id: deriveId(input),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      relationship: input.relationship.trim(),
      timezone: input.timezone.trim(),
    }))
    .filter((profile) => profile.id && profile.name && profile.email && profile.relationship && profile.timezone);

  return profiles.length ? profiles : fallbackProfiles(allowedEmails);
}

export function familyProfileCandidates(email: string, profiles: FamilyProfile[]): string[] {
  const profile = findFamilyProfile(email, profiles);
  return [
    email.split("@")[0] ?? "",
    profile?.id,
    profile?.name,
  ].filter((value): value is string => Boolean(value?.trim()));
}

export function profileKeyMatches(value: string, candidate: string): boolean {
  return compact(value) === compact(candidate);
}

export function findFamilyProfile(email: string | undefined, profiles: FamilyProfile[]): FamilyProfile | null {
  const normalEmail = email?.trim().toLowerCase();
  if (!normalEmail) return null;
  return profiles.find((profile) => profile.email.toLowerCase() === normalEmail) ?? null;
}

export function listFamilyMembers(profiles: FamilyProfile[]): FamilyProfile[] {
  return profiles.map((profile) => ({ ...profile }));
}
