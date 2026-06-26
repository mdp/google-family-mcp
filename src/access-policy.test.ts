import { describe, expect, it } from "vitest";
import {
  assertAttendeesAllowed,
  assertRecipientsAllowed,
  resolveTargetAccount,
} from "./access-policy.js";

const allowed = "adult1@example.com,adult2@example.com";

describe("family access policy", () => {
  it("allows any family member to target another allowed family account", () => {
    expect(resolveTargetAccount("adult1@example.com", "adult2@example.com", allowed)).toEqual({
      ok: true,
      account: "adult2@example.com",
    });
  });

  it("blocks non-family account targets", () => {
    expect(resolveTargetAccount("adult1@example.com", "friend@example.net", allowed)).toEqual({
      ok: false,
      error: 'Account "friend@example.net" is not a family member.',
    });
  });

  it("allows family email recipients without external allowlist entries", () => {
    expect(() => {
      assertRecipientsAllowed({ to: "Adult 2 <adult2@example.com>" }, allowed, "");
    }).not.toThrow();
  });

  it("allows family calendar attendees without external allowlist entries", () => {
    expect(() => {
      assertAttendeesAllowed([{ email: "adult2@example.com" }], allowed, "");
    }).not.toThrow();
  });

  it("blocks non-family recipients unless externally allowlisted", () => {
    expect(() => {
      assertRecipientsAllowed({ to: "friend@example.net" }, allowed, "");
    }).toThrow("Recipients not on allowed list: friend@example.net");
  });
});
