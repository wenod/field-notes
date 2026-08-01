import { readFile, unlink, writeFile } from "node:fs/promises";

const distURL = new URL("../dist/", import.meta.url);
const indexURL = new URL("index.html", distURL);
const dataURL = new URL("data/bookmarks.json", distURL);
const desktopDataURL = new URL("desktop-data.js", distURL);

const [html, rawPayload] = await Promise.all([
  readFile(indexURL, "utf8"),
  readFile(dataURL, "utf8"),
]);

const moduleScriptMarker = "<script type=\"module\"";
if (!html.includes(moduleScriptMarker)) {
  throw new Error("Could not locate the Vite module script in dist/index.html.");
}

const desktopHTML = html.replace(
  moduleScriptMarker,
  "<script src=\"./desktop-data.js\"></script>\n    <script type=\"module\"",
);

await Promise.all([
  writeFile(indexURL, desktopHTML, "utf8"),
  writeFile(desktopDataURL, `window.__FIELD_NOTES_DATA__ = ${rawPayload};\n`, "utf8"),
]);

await unlink(dataURL);
