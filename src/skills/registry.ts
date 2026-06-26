import aboutSkill from "./library/about/SKILL.md?raw";
import familyGoogleSkill from "./library/family-google/SKILL.md?raw";
import emailSearchSkill from "./library/email-search/SKILL.md?raw";
import calendarSkill from "./library/calendar/SKILL.md?raw";
import {
  familyProfileCandidates,
  findFamilyProfile,
  listFamilyMembers,
  profileKeyMatches,
  type FamilyProfile,
} from "../family-profiles.js";

export const SKILL_NAMES = ["about", "family-google", "email-search", "calendar"] as const;
export type SkillName = typeof SKILL_NAMES[number];

export interface SkillVariant {
  variant: string;
  content: string;
  source: string;
}

export interface SkillDefinition {
  name: SkillName;
  title: string;
  description: string;
  when_to_use: string;
  related_toolsets: string[];
  variants: SkillVariant[];
}

export interface SkillAuthContext {
  email: string;
  family_profile: FamilyProfile | null;
}

const SKILLS: SkillDefinition[] = [
  {
    name: "about",
    title: "About the current family member",
    description: "Auth and family-profile context for the authenticated user of this Family MCP.",
    when_to_use: "Use before personalizing Gmail, calendar, Drive, or family-account workflows around the current user.",
    related_toolsets: ["core", "google"],
    variants: [
      { variant: "default", content: aboutSkill, source: "skill://family/about/SKILL.md" },
    ],
  },
  {
    name: "family-google",
    title: "Family MCP operating guide",
    description: "Rules for shared family Gmail, Calendar, Drive, cross-account access, and account selection.",
    when_to_use: "Use before operating on family Gmail, Calendar, or Drive, especially cross-account requests.",
    related_toolsets: ["google"],
    variants: [
      { variant: "default", content: familyGoogleSkill, source: "skill://family/family-google/SKILL.md" },
    ],
  },
  {
    name: "email-search",
    title: "Family email search",
    description: "Workflow for searching and reading Gmail across one or more family accounts.",
    when_to_use: "Use before shared Gmail search, all-account email search, or reading family email threads.",
    related_toolsets: ["google"],
    variants: [
      { variant: "default", content: emailSearchSkill, source: "skill://family/email-search/SKILL.md" },
    ],
  },
  {
    name: "calendar",
    title: "Family calendar",
    description: "Workflow for checking schedules, creating events, and sending invites between family members.",
    when_to_use: "Use before listing, creating, updating, or deleting family calendar events.",
    related_toolsets: ["google"],
    variants: [
      { variant: "default", content: calendarSkill, source: "skill://family/calendar/SKILL.md" },
    ],
  },
];

const byName = new Map(SKILLS.map((skill) => [skill.name, skill]));

function variantMatches(variant: string, requested: string): boolean {
  return profileKeyMatches(variant, requested);
}

export function listSkills(callerEmail: string, profiles: FamilyProfile[]) {
  const callerVariants = familyProfileCandidates(callerEmail, profiles);
  return SKILLS.map((skill) => {
    const callerOverride = skill.variants.find((variant) => (
      variant.variant !== "default" && callerVariants.some((candidate) => variantMatches(variant.variant, candidate))
    ));
    return {
      name: skill.name,
      title: skill.title,
      description: skill.description,
      when_to_use: skill.when_to_use,
      related_toolsets: skill.related_toolsets,
      variants: skill.variants.map((variant) => variant.variant),
      caller_override_available: Boolean(callerOverride),
      default_call: { tool: "skills_get", arguments: { name: skill.name } },
    };
  });
}

export function skillIndex(callerEmail: string, profiles: FamilyProfile[]) {
  return {
    source: "family-mcp",
    guidance: [
      "Call skills_get({ name: 'about' }) to understand the authenticated family member.",
      "Call skills_get({ name: 'family-google' }) before cross-account family Gmail, Calendar, or Drive work.",
      "Call skills_get({ name: 'email-search' }) before broad or shared Gmail searches.",
      "Call skills_get({ name: 'calendar' }) before scheduling or changing family calendar events.",
    ],
    family_members: listFamilyMembers(profiles),
    skills: listSkills(callerEmail, profiles),
  };
}

export function skillCatalogSummary(): string {
  return SKILLS.map((skill) => `${skill.name}: ${skill.description}`).join("; ");
}

export function resolveSkill(
  name: SkillName,
  callerEmail: string,
  profiles: FamilyProfile[],
  variant?: string,
): { skill: SkillDefinition; selected: SkillVariant } | { error: string } {
  const skill = byName.get(name);
  if (!skill) return { error: `Unknown skill: ${name}` };

  if (variant) {
    const selected = skill.variants.find((entry) => variantMatches(entry.variant, variant));
    if (!selected) {
      return {
        error: `Unknown variant "${variant}" for ${name}. Available variants: ${skill.variants.map((entry) => entry.variant).join(", ")}.`,
      };
    }
    return { skill, selected };
  }

  const callerVariants = familyProfileCandidates(callerEmail, profiles);
  const callerOverride = skill.variants.find((entry) => (
    entry.variant !== "default" && callerVariants.some((candidate) => variantMatches(entry.variant, candidate))
  ));
  return {
    skill,
    selected: callerOverride ?? skill.variants[0],
  };
}

export function authContext(callerEmail: string, profiles: FamilyProfile[]): SkillAuthContext {
  return {
    email: callerEmail,
    family_profile: findFamilyProfile(callerEmail, profiles),
  };
}

function familyProfileMarkdown(profile: FamilyProfile | null): string {
  if (!profile) return "No family profile matched the authenticated email.";
  return [
    `- Name: ${profile.name}`,
    `- Email: ${profile.email}`,
    `- Relationship: ${profile.relationship}`,
    `- Timezone: ${profile.timezone}`,
  ].join("\n");
}

function familyRosterMarkdown(profiles: FamilyProfile[]): string {
  return [
    "| Name | Email | Relationship | Timezone |",
    "| --- | --- | --- | --- |",
    ...listFamilyMembers(profiles).map((profile) => (
      `| ${profile.name} | ${profile.email} | ${profile.relationship} | ${profile.timezone} |`
    )),
  ].join("\n");
}

export function renderSkillMarkdown(
  name: SkillName,
  callerEmail: string,
  profiles: FamilyProfile[],
  variant?: string,
): { markdown: string; source: string; variant: string } | { error: string } {
  const resolved = resolveSkill(name, callerEmail, profiles, variant);
  if ("error" in resolved) return resolved;

  const sharedContext = `\n\n## Family Roster\n\n${familyRosterMarkdown(profiles)}\n`;

  if (name !== "about") {
    return {
      markdown: `${resolved.selected.content.trim()}${sharedContext}`,
      source: resolved.selected.source,
      variant: resolved.selected.variant,
    };
  }

  const context = authContext(callerEmail, profiles);
  return {
    markdown: `${resolved.selected.content.trim()}\n\n## Current Auth Context\n\n- Email: ${context.email}\n\n## Current Family Profile\n\n${familyProfileMarkdown(context.family_profile)}${sharedContext}`,
    source: resolved.selected.source,
    variant: resolved.selected.variant,
  };
}
