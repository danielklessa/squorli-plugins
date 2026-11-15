#!/usr/bin/env node
/**
 * Prints what the checked plugins ask for as a Markdown table, for a workflow's step summary: the reviewer sees the
 * capabilities and the hosts of a pull request without opening the file.
 *
 *   node tools/summary.mjs <plugin:check JSON> >> "$GITHUB_STEP_SUMMARY"
 *
 * Everything that comes from a submitted file is written as plain text (`plain` in lib.mjs).
 */
import { plain, readJson } from "./lib.mjs";

const file = process.argv[2];
if (!file) { console.error("usage: summary.mjs <plugin:check JSON>"); process.exit(2); }
const entries = readJson(file)?.files ?? [];
const out = ["| Plugin | Version | Interface | Capabilities | Hosts | Server's check |", "|---|---|---|---|---|---|"];
for (const e of entries) {
  const list = (v) => (Array.isArray(v) && v.length ? v.map((x) => plain(x, 80)).join("<br>") : "none");
  out.push(`| ${plain(e.id ?? String(e.file).split(/[\\/]/).pop(), 40)} | ${plain(e.version ?? "", 20)} | ${plain(e.apiVersion ?? "", 5)} | ${list(e.capabilities)} | ${list(e.hosts)} | ${e.ok ? "accepted" : `refused: ${plain(e.error, 300)}`} |`);
}
console.log(out.join("\n"));
