import { describe, expect, it } from "vitest";
import { authContext, listSkills, renderSkillMarkdown, skillIndex } from "./registry.js";
import type { FamilyProfile } from "../family-profiles.js";

const profiles: FamilyProfile[] = [
  {
    id: "adult1",
    name: "Adult 1",
    email: "adult1@example.com",
    relationship: "adult",
    timezone: "Etc/UTC",
  },
  {
    id: "adult2",
    name: "Adult 2",
    email: "adult2@example.com",
    relationship: "adult",
    timezone: "Etc/UTC",
  },
];

describe("skill registry", () => {
  it("lists the expected family skills", () => {
    expect(listSkills("adult1@example.com", profiles).map((skill) => skill.name)).toEqual([
      "about",
      "family-google",
      "email-search",
      "calendar",
    ]);
  });

  it("renders the default skill variant", () => {
    const rendered = renderSkillMarkdown("family-google", "adult1@example.com", profiles);
    expect(rendered).not.toHaveProperty("error");
    if ("markdown" in rendered) {
      expect(rendered.variant).toBe("default");
      expect(rendered.markdown).toContain("# Family MCP");
      expect(rendered.markdown).toContain("## Family Roster");
    }
  });

  it("includes auth context and family profile in about", () => {
    const rendered = renderSkillMarkdown("about", "adult1@example.com", profiles);
    expect(rendered).not.toHaveProperty("error");
    if ("markdown" in rendered) {
      expect(rendered.markdown).toContain("- Email: adult1@example.com");
      expect(rendered.markdown).toContain("- Relationship: adult");
    }
  });

  it("returns family members in the skill index", () => {
    const index = skillIndex("adult1@example.com", profiles);
    expect(index.family_members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Adult 1", email: "adult1@example.com", relationship: "adult" }),
      ]),
    );
  });

  it("exposes matched auth profile", () => {
    expect(authContext("adult2@example.com", profiles).family_profile).toEqual(
      expect.objectContaining({ name: "Adult 2", relationship: "adult" }),
    );
  });
});
