#!/usr/bin/env node
/**
 * Prints the text of a signed plugin's GitHub release (Markdown) and, with `--field`, single facts for the workflow.
 *
 *   node tools/release-notes.mjs <plugin:check JSON of the signed file>            the release's text
 *   node tools/release-notes.mjs <plugin:check JSON> --field version|author|file   one value, checked, on one line
 *
 * The plugin's own texts (name, description, author) come from a submitted file: they are written as plain text
 * (`plain` in lib.mjs), and `--field` prints a value only in the form it must have.
 */
import { ID_RE, VERSION_RE, fail, oneLine, parseArgs, plain, readJson } from "./lib.mjs";

const { positional, options } = parseArgs(process.argv.slice(2));
if (positional.length !== 1) fail("usage: release-notes.mjs <plugin:check JSON> [--field version|author|file]");
const entries = readJson(positional[0])?.files ?? [];
if (entries.length !== 1) fail("the check result must be about exactly one file");
const e = entries[0];
if (typeof e.id !== "string" || !ID_RE.test(e.id) || typeof e.version !== "string" || !VERSION_RE.test(e.version) || (e.language !== "ts" && e.language !== "js")) fail(`the server could not read the plugin: ${e.error ?? "no id, version or language"}`);

if (typeof options.field === "string") {
  if (options.field === "version") console.log(e.version);
  else if (options.field === "file") console.log(`${e.id}.${e.language}`);
  // One line without control characters; the workflow only compares it.
  else if (options.field === "author") console.log(oneLine(e.author));
  else fail("--field is version, author or file");
  process.exit(0);
}

const kind = e.signature?.status === "valid" ? e.signature.kind : null;
if (!kind) fail("the file carries no signature the server at this commit takes");
const file = `${e.id}.${e.language}`;
const text = (t) => plain(typeof t === "string" ? t : t?.en ?? "", 400);
const lines = [
  `**${text(e.name)}** ${e.version}${e.author ? `, by ${plain(e.author, 80)}` : ""}`,
  "",
  text(e.description),
  "",
  kind === "official"
    ? "Signed by Squorli as **official**: this is Squorli's own plugin."
    : "Signed by Squorli as **reviewed**: somebody else's plugin whose source Squorli read in this version (what that says and does not say: [REVIEW.md](https://github.com/danielklessa/squorli-plugins/blob/main/REVIEW.md)).",
  "",
  `- Interface version: ${e.apiVersion}`,
  `- Capabilities: ${e.capabilities.length ? e.capabilities.map((c) => `\`${plain(c, 40)}\``).join(", ") : "none"}`,
  `- Hosts it fetches from: ${e.hosts.length ? e.hosts.map((h) => `\`${plain(h, 253)}\``).join(", ") : "none"}`,
  `- SHA-256 of the file without its signature: \`${e.hash}\``,
  `- Source as it was read: [plugins/${e.id}](https://github.com/danielklessa/squorli-plugins/tree/main/plugins/${e.id})`,
  "",
  `**Install:** download \`${file}\` below and upload it in Verwaltung > Plugins of your server, or run \`squorli plugin add ${file}\` on the machine. The server checks the signature itself and refuses a file that was changed. Do not edit the file: one changed character and the signature no longer holds.`,
  "",
  "All signed plugins: https://squorli.com/en/plugins/ (German: https://squorli.com/de/plugins/).",
];
console.log(lines.join("\n"));
