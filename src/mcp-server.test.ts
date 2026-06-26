import { describe, expect, it, vi } from "vitest";
import { searchAllFamilyGmail } from "./mcp-server.js";
import type { GoogleClient } from "./google-client.js";
import type { FamilyProfile } from "./family-profiles.js";

vi.mock("./gmail-service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gmail-service.js")>();
  return {
    ...actual,
    gmailSearch: vi.fn(async (_client: GoogleClient, query: string, maxResults: number) => [
      {
        threadId: `${query}-${maxResults}`,
        subject: "Family result",
        from: "sender@example.com",
        date: "Mon, 01 Jan 2024 00:00:00 +0000",
        snippet: "snippet",
        messageCount: 1,
      },
    ]),
  };
});

describe("searchAllFamilyGmail", () => {
  it("searches every authorized family account and reports missing credentials", async () => {
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
    const result = await searchAllFamilyGmail({
      allowedEmails: ["adult1@example.com", "missing@example.com", "adult2@example.com"],
      profiles,
      query: "subject:test",
      maxResults: 2,
      clientFor: async (email) => (email === "missing@example.com" ? null : ({} as GoogleClient)),
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          account: "adult1@example.com",
          name: "Adult 1",
          relationship: "adult",
          timezone: "Etc/UTC",
          authorized: true,
          results: [expect.objectContaining({ threadId: "subject:test-2" })],
        }),
        expect.objectContaining({
          account: "missing@example.com",
          authorized: false,
          results: [],
        }),
        expect.objectContaining({
          account: "adult2@example.com",
          name: "Adult 2",
          relationship: "adult",
          timezone: "Etc/UTC",
          authorized: true,
        }),
      ]),
    );
  });
});
