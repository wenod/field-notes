import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("builds a genuine static single-page application", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Field Notes — Technical Bookmark Library<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/i);
  assert.match(html, /<script type="module"[^>]+src="\.\/assets\//i);
  assert.doesNotMatch(html, /_next|react-server|rsc|codex-preview/i);
});

test("copies the complete technical index into the static build", async () => {
  let dataURL = new URL("../dist/data/bookmarks.json", import.meta.url);
  let raw;
  try {
    raw = await readFile(dataURL, "utf8");
  } catch {
    dataURL = new URL("../dist/data/bookmarks.public.json", import.meta.url);
    raw = await readFile(dataURL, "utf8");
  }
  const payload = JSON.parse(raw);
  const file = await stat(dataURL);

  assert.equal(payload.meta.includedCount, payload.records.length);
  assert.equal(payload.meta.malformedCount, 0);
  assert.equal(payload.meta.shelves.length, 5);
  assert.ok(payload.meta.sourceCount >= payload.meta.includedCount);
  assert.ok(payload.meta.includedCount > 0);
  assert.ok(file.size < 8 * 1024 * 1024);

  const publicText = payload.records
    .flatMap((record) => [record.text, record.quoteText, record.articleTitle, record.articlePreview])
    .filter(Boolean)
    .join("\n");
  assert.doesNotMatch(
    publicText,
    /\b(pussy|porn(?:ography|ographic)?|onlyfans|nudes?|blowjob|handjob|sex tape|masturbat(?:e|ion)|orgasm|anal sex|xxx)\b/i,
    "explicit sexual content must not enter the technical index",
  );
});

test("the synthetic fixture demonstrates technical inclusion and hard exclusions", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "field-notes-test-"));
  const outputPath = join(temporaryDirectory, "bookmarks.json");

  try {
    await execFileAsync(process.execPath, ["scripts/build-library.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        BOOKMARKS_SOURCE: "examples/posts.sample.jsonl",
        BOOKMARKS_OUTPUT: outputPath,
      },
    });

    const payload = JSON.parse(await readFile(outputPath, "utf8"));
    assert.equal(payload.meta.sourceCount, 7);
    assert.equal(payload.meta.includedCount, 5);
    assert.equal(payload.meta.excludedCount, 2);
    assert.deepEqual(
      new Set(payload.records.map((record) => record.shelf)),
      new Set(["AI & Intelligence", "Software Craft", "Systems & Infrastructure", "Data & Machine Learning", "Science & Mathematics"]),
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
