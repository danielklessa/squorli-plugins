#!/usr/bin/env node
/**
 * Prints the plugin files of this repository, one absolute path per line: all of them, or only those in folders a pull
 * request touched.
 *
 *   node tools/list-plugins.mjs [--base <dir>] [--changed-z <file>]
 *
 * `--base` = the checkout whose `plugins/` is read (default: the current directory). `--changed-z` = a file with the
 * changed paths as `git diff --name-only -z` prints them (separated by NUL bytes); only folders named there are listed, and
 * a folder that was removed is left out.
 *
 * File names in a pull request are somebody else's text. This tool is the one place that reads them: a folder under
 * `plugins/` whose name is no plugin id is an error, and a path that leaves `plugins/<id>/` is never printed, so what the
 * workflow hands on to a shell is made of names this tool has checked.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { ID_RE, parseArgs } from "./lib.mjs";

const { options } = parseArgs(process.argv.slice(2));
const base = resolve(typeof options.base === "string" ? options.base : ".");
const pluginsDir = join(base, "plugins");
const problems = [];

let ids;
if (typeof options["changed-z"] === "string") {
  const touched = new Set();
  for (const path of readFileSync(options["changed-z"], "utf8").split("\0").filter(Boolean)) {
    const parts = path.split("/");
    if (parts[0] !== "plugins" || parts.length < 2) continue;
    if (parts.length === 2) { problems.push(`plugins/ holds folders only, one per plugin; found the file ${JSON.stringify(path)}`); continue; }
    if (!ID_RE.test(parts[1])) { problems.push(`the folder ${JSON.stringify(parts[1])} under plugins/ is no plugin id (lower case letters, digits and "-", 3 to 32 characters, a letter first)`); continue; }
    touched.add(parts[1]);
  }
  ids = [...touched].filter((id) => existsSync(join(pluginsDir, id))).sort();
} else {
  ids = [];
  for (const entry of existsSync(pluginsDir) ? readdirSync(pluginsDir, { withFileTypes: true }) : []) {
    if (!entry.isDirectory()) { problems.push(`plugins/ holds folders only, one per plugin; found the file ${JSON.stringify(entry.name)}`); continue; }
    if (!ID_RE.test(entry.name)) { problems.push(`the folder ${JSON.stringify(entry.name)} under plugins/ is no plugin id`); continue; }
    ids.push(entry.name);
  }
  ids.sort();
}

const files = [];
for (const id of ids) {
  const found = ["ts", "js"].map((ext) => join(pluginsDir, id, `${id}.${ext}`)).filter((f) => existsSync(f) && statSync(f).isFile());
  if (found.length === 1) files.push(found[0]);
  else problems.push(found.length === 0 ? `plugins/${id}/ holds no plugin file: it must be named ${id}.ts or ${id}.js` : `plugins/${id}/ holds both ${id}.ts and ${id}.js: a plugin is one file`);
}

if (problems.length) {
  for (const p of problems) console.error(`REFUSED: ${p}`);
  process.exit(1);
}
for (const f of files) console.log(f);
