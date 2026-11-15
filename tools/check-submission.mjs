#!/usr/bin/env node
/**
 * The rules a submitted plugin must meet beyond what the server checks at installation.
 *
 *   node tools/check-submission.mjs <plugin:check JSON> [--base <dir>] [--catalog <file>]
 *
 * `<plugin:check JSON>` = what `pnpm --filter @squorli/server plugin:check <files>` of the server repository printed for the
 * plugin files (its `file` fields are paths below `<base>/plugins/`). `--base` = the checkout the files lie in (default:
 * the current directory), `--catalog` = the catalogue to compare versions with (default: `<base>/catalog.json`; the pull
 * request check names the one of the base branch, so a pull request cannot bring its own).
 *
 * What the server's own check found (a manifest that is not valid, code that does not compile, a broken signature) is
 * reported first, as the server said it. Then, per plugin:
 *   - the folder is `plugins/<id>/` and holds the plugin file `<id>.ts` or `<id>.js`, a README.md and nothing else
 *     (a LICENSE file is allowed);
 *   - the file carries no signature: the signing workflow of this repository puts it there, nobody else;
 *   - a licence is named in the first 200 lines as `SPDX-License-Identifier: <id>`, one of LICENCES below;
 *   - the source is readable: no line over 2000 characters, on average at most 300 (bundled or minified code is refused);
 *   - the README names every host of the manifest's `network`;
 *   - the version is higher than the signed one in the catalogue, unless the file is that very version.
 * Ends with exit code 1 when anything is refused. Reads files as text; never runs a plugin.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ID_RE, VERSION_RE, compareVersions, parseArgs, readJson } from "./lib.mjs";

export const LICENCES = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "MPL-2.0", "GPL-3.0-or-later", "AGPL-3.0-or-later"];
const LINE_MAX = 2000, LINE_AVERAGE_MAX = 300, LICENCE_LINES = 200;
const SPDX = /SPDX-License-Identifier:[ \t]*([A-Za-z0-9.+-]{1,40})/;

/** The problems of one checked file; empty = accepted. */
export function problemsOf(entry, base, catalog) {
  const problems = [];
  if (!entry.ok) problems.push(`the server refuses the file: ${entry.error ?? "no reason given"}`);
  const file = resolve(String(entry.file));
  const rel = relative(base, file).split("\\").join("/");
  const parts = rel.split("/");
  if (parts.length !== 3 || parts[0] !== "plugins") { problems.push(`the file must lie at plugins/<id>/<id>.ts or .js, not at ${JSON.stringify(rel)}`); return problems; }
  const folder = parts[1], name = parts[2];
  if (!ID_RE.test(folder)) { problems.push(`the folder ${JSON.stringify(folder)} is no plugin id`); return problems; }
  // Without a manifest the server read, the remaining rules have nothing to hold on to.
  if (typeof entry.id !== "string") return problems;
  if (entry.id !== folder) problems.push(`the folder is named "${folder}", the manifest's id is "${entry.id}": they must be the same`);
  if (name !== `${folder}.ts` && name !== `${folder}.js`) problems.push(`the file must be named ${folder}.ts or ${folder}.js, not ${JSON.stringify(name)}`);

  const dir = dirname(file);
  const others = readdirSync(dir).filter((n) => n !== name);
  if (!others.includes("README.md")) problems.push(`plugins/${folder}/README.md is missing: it says what the plugin does and what it needs each host for`);
  const extra = others.filter((n) => !["README.md", "LICENSE", "LICENSE.md", "LICENSE.txt"].includes(n));
  if (extra.length) problems.push(`plugins/${folder}/ holds the plugin file and a README.md, nothing else; found ${extra.map((n) => JSON.stringify(n)).join(", ")}`);

  const status = entry.signature?.status;
  if (status !== "none") problems.push(status === "valid" || status === "revoked"
    ? "the file carries a signature already: submit the unsigned file, the signing workflow of this repository adds the signature"
    : "the file ends with a signature comment: remove it, the signing workflow of this repository adds the signature");

  const source = existsSync(file) ? readFileSync(file, "utf8") : "";
  const lines = source.split("\n");
  const licence = SPDX.exec(lines.slice(0, LICENCE_LINES).join("\n"))?.[1];
  if (!licence) problems.push(`no licence is named: put a line "// SPDX-License-Identifier: <licence>" into the first ${LICENCE_LINES} lines (one of ${LICENCES.join(", ")})`);
  else if (!LICENCES.includes(licence)) problems.push(`the licence "${licence}" is not one this repository takes (${LICENCES.join(", ")})`);

  const longest = lines.reduce((max, l) => Math.max(max, l.length), 0);
  const average = lines.length ? source.length / lines.length : 0;
  if (longest > LINE_MAX) problems.push(`a line of ${longest} characters: the source must be readable as its author wrote it, not bundled or minified (at most ${LINE_MAX} characters a line)`);
  else if (average > LINE_AVERAGE_MAX) problems.push(`lines of ${Math.round(average)} characters on average: the source must be readable as its author wrote it, not bundled or minified`);

  const readme = existsSync(join(dir, "README.md")) ? readFileSync(join(dir, "README.md"), "utf8") : "";
  const hosts = Array.isArray(entry.hosts) ? entry.hosts.filter((h) => typeof h === "string") : [];
  const unnamed = hosts.filter((h) => !readme.includes(h));
  if (readme && unnamed.length) problems.push(`the README does not name ${unnamed.join(", ")}: it must say for every host of the manifest what the plugin asks there and why`);
  const wantsNet = Array.isArray(entry.capabilities) && entry.capabilities.includes("net.fetch");
  if (wantsNet && hosts.length === 0) problems.push('the plugin asks for "net.fetch" and names no hosts');

  const signed = (catalog?.plugins ?? []).find((p) => p.id === entry.id);
  if (signed && typeof entry.version === "string" && VERSION_RE.test(entry.version) && signed.sha256 !== entry.hash && compareVersions(entry.version, signed.version) <= 0) {
    problems.push(`version ${entry.version} is not higher than the signed version ${signed.version}: a changed plugin needs a new version`);
  }
  return problems;
}

function main(argv) {
  const { positional, options } = parseArgs(argv);
  if (positional.length !== 1) { console.error("usage: check-submission.mjs <plugin:check JSON> [--base <dir>] [--catalog <file>]"); return 2; }
  const base = resolve(typeof options.base === "string" ? options.base : ".");
  const catalogFile = typeof options.catalog === "string" ? options.catalog : join(base, "catalog.json");
  const catalog = existsSync(catalogFile) ? readJson(catalogFile) : { plugins: [] };
  const report = readJson(positional[0]);
  const entries = Array.isArray(report?.files) ? report.files : [];
  if (entries.length === 0) { console.error("REFUSED: the check named no plugin file"); return 1; }
  let refused = 0;
  const seen = new Set();
  for (const entry of entries) {
    const label = typeof entry.id === "string" && ID_RE.test(entry.id) ? `${entry.id} ${VERSION_RE.test(String(entry.version)) ? entry.version : ""}`.trim() : basename(String(entry.file));
    const problems = problemsOf(entry, base, catalog);
    if (typeof entry.id === "string") { if (seen.has(entry.id)) problems.push(`the id "${entry.id}" is used by two files`); seen.add(entry.id); }
    if (problems.length === 0) { console.log(`ok       ${label}`); continue; }
    refused++;
    console.error(`REFUSED  ${label}`);
    for (const p of problems) console.error(`  - ${p}`);
  }
  if (refused) console.error(`\n${refused} of ${entries.length} refused. The rules: README.md ("How to submit a plugin") and REVIEW.md.`);
  return refused ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2));
