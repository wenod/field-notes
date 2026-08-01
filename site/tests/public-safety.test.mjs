import assert from "node:assert/strict";
import test from "node:test";
import {
  containsDirectContactDetails,
  findPublicSafetyViolation,
  redactPublicContactDetails,
} from "../scripts/public-safety.mjs";

test("blocks representative unsafe and off-topic material", () => {
  const unsafe = [
    "A report of a woman who was sexually assaulted while travelling.",
    "Instructions to synthesize psilocybin in a home lab.",
    "This miracle cure is something doctors do not want you to know.",
    "His contact number is +91 98765 43210; expose this scammer.",
    "The deleted climax scene from a movie was leaked.",
  ];

  for (const text of unsafe) assert.ok(findPublicSafetyViolation(text), text);
});

test("does not confuse legitimate technical safety discussion with harmful instructions", () => {
  assert.equal(
    findPublicSafetyViolation("A defensive paper measures prompt-injection data exfiltration and proposes mitigations."),
    null,
  );
  assert.equal(
    findPublicSafetyViolation("A language model research paper simulates historical conflicts with multi-agent systems."),
    null,
  );
});

test("redacts direct contact details from the public edition", () => {
  const input = "Email researcher@example.com or call +91 98765 43210.";
  const redacted = redactPublicContactDetails(input);

  assert.equal(containsDirectContactDetails(redacted), false);
  assert.match(redacted, /\[email removed\]/);
  assert.match(redacted, /\[phone number removed\]/);
});
