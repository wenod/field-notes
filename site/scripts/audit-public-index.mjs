import fs from "node:fs";
import path from "node:path";
import {
  containsDirectContactDetails,
  credentialPatterns,
  findPublicSafetyViolation,
  safetyText,
} from "./public-safety.mjs";

const indexPath = path.resolve(process.cwd(), process.argv[2] || "public/data/bookmarks.public.json");
const payload = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const failures = [];
const ids = new Set();
const allowedRecordKeys = new Set([
  "id", "url", "author", "handle", "text", "quoteText", "articleTitle", "articlePreview",
  "createdAt", "year", "shelf", "topics", "formats", "domains", "links", "language",
  "media", "stats", "quality", "flags",
]);
const sensitiveURLParameter = /^(?:token|access_token|api_?key|auth|signature|sig|secret|password)$/i;

if (payload.meta?.publicEdition !== true) failures.push("meta.publicEdition must be true");
if (payload.meta?.includedCount !== payload.records?.length) failures.push("includedCount does not match the record array");
if (!Array.isArray(payload.records) || payload.records.length === 0) failures.push("the public index is empty");

for (const record of payload.records ?? []) {
  if (ids.has(record.id)) failures.push(`duplicate record id ${record.id}`);
  ids.add(record.id);
  if (record.language !== "en") failures.push(`${record.id}: public record is not English`);
  for (const key of Object.keys(record)) {
    if (!allowedRecordKeys.has(key)) failures.push(`${record.id}: unexpected record field ${key}`);
  }

  const text = safetyText([
    record.text,
    record.quoteText,
    record.articleTitle,
    record.articlePreview,
  ]);
  const violation = findPublicSafetyViolation(text);
  if (violation) failures.push(`${record.id}: ${violation}`);
  if (containsDirectContactDetails(text)) failures.push(`${record.id}: direct email address or phone number`);
  if (credentialPatterns.some((pattern) => pattern.test(text))) failures.push(`${record.id}: credential-like secret`);

  for (const link of record.links ?? []) {
    try {
      const url = new URL(link.url);
      if (url.protocol !== "https:") failures.push(`${record.id}: non-HTTPS link ${link.url}`);
      for (const key of url.searchParams.keys()) {
        if (sensitiveURLParameter.test(key)) failures.push(`${record.id}: sensitive URL parameter ${key}`);
      }
    } catch {
      failures.push(`${record.id}: malformed link ${link.url}`);
    }
  }
}

if (failures.length) {
  console.error(`Public-index audit failed with ${failures.length} issue(s):`);
  for (const failure of failures.slice(0, 100)) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    path: indexPath,
    records: payload.records.length,
    result: "PASS",
    checks: [
      "explicit and exploitative sexual content",
      "hateful slurs",
      "dangerous or illegal instructions",
      "actionable self-harm content",
      "sensational medical misinformation",
      "doxxing and direct contact details",
      "credential-like secrets",
      "English-only auditable text and a minimal public schema",
      "HTTPS links without credential-like parameters",
      "known off-topic politics, conflict, culture, and piracy",
    ],
  }, null, 2));
}
