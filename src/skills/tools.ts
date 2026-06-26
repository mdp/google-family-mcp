import { z } from "zod";
import type { AuthExtra } from "../types.js";
import {
  SKILL_NAMES,
  authContext,
  renderSkillMarkdown,
  resolveSkill,
  skillCatalogSummary,
  skillIndex,
  type SkillName,
} from "./registry.js";
import type { FamilyProfile } from "../family-profiles.js";

function successResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

function caller(extra: { authInfo?: { extra?: unknown } }, fallbackEmail: string): { email: string } {
  const auth = extra.authInfo?.extra as AuthExtra | undefined;
  return { email: auth?.email ?? fallbackEmail };
}

const skillNameSchema = z.enum(SKILL_NAMES);

export function registerSkillTools(
  server: {
    tool: (...args: any[]) => void;
  },
  callerEmail: string,
  profiles: FamilyProfile[],
): void {
  const catalog = skillCatalogSummary();

  server.tool(
    "skills_list",
    `List static Family MCP skills available through this server. Available skills: ${catalog}`,
    {},
    async (_args: unknown, extra: { authInfo?: { extra?: unknown } }) => {
      const { email } = caller(extra, callerEmail);
      return successResult(skillIndex(email, profiles));
    },
  );

  server.tool(
    "skills_get",
    `Get a static Family MCP skill as SKILL.md markdown. Available skills: ${catalog}`,
    {
      name: skillNameSchema.describe("Skill name to load."),
      variant: z.string().optional().describe("Optional explicit variant. Omit to use the caller-specific override when available."),
    },
    async (
      { name, variant }: { name: SkillName; variant?: string },
      extra: { authInfo?: { extra?: unknown } },
    ) => {
      const { email } = caller(extra, callerEmail);
      const resolved = resolveSkill(name, email, profiles, variant);
      if ("error" in resolved) return errorResult(resolved.error);
      const rendered = renderSkillMarkdown(name, email, profiles, variant);
      if ("error" in rendered) return errorResult(rendered.error);
      return successResult({
        name,
        title: resolved.skill.title,
        description: resolved.skill.description,
        variant: rendered.variant,
        source: rendered.source,
        auth: name === "about" ? authContext(email, profiles) : undefined,
        content: rendered.markdown,
      });
    },
  );
}
