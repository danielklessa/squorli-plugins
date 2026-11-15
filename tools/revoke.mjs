#!/usr/bin/env node
/**
 * Takes a signature back: appends one signed version to revoked.json.
 *
 *   node tools/revoke.mjs <id> <version> --sha256 <hash> --reason "<one sentence>" [--date YYYY-MM-DD] [--file <revoked.json>]
 *
 * `--sha256` = the hash the catalogue (or `plugin-sign.mjs hash <file>`) names for that version: the SHA-256 of the file
 * without its signature comment. It is asked for on purpose instead of being looked up: the catalogue holds only the newest
 * version of a plugin, and a revocation must name exactly the bytes that were signed.
 *
 * revoked.json is the source of `REVOKED_PLUGIN_HASHES` in the server (apps/server/src/plugins/signingKeys.ts), copied there
 * before a server release. A server learns of a revocation with its next update and not before: it asks nobody. When the
 * revoked version is the catalogue's entry, that entry is removed here too, so the website stops offering it.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ID_RE, VERSION_RE, fail, parseArgs, readJson, today, writeJson } from "./lib.mjs";

const { positional, options } = parseArgs(process.argv.slice(2));
const [id, version] = positional;
const usage = 'usage: revoke.mjs <id> <version> --sha256 <hash> --reason "<one sentence>" [--date YYYY-MM-DD] [--file <revoked.json>]';
if (positional.length !== 2 || typeof options.sha256 !== "string" || typeof options.reason !== "string") fail(usage);
if (!ID_RE.test(id)) fail("the first argument is a plugin id");
if (!VERSION_RE.test(version)) fail("the second argument is a version such as 1.2.3");
const sha256 = options.sha256.toLowerCase();
if (!/^[0-9a-f]{64}$/.test(sha256)) fail("--sha256 is 64 hex characters");
const reason = options.reason.replace(/\s+/g, " ").trim();
if (reason.length < 10 || reason.length > 300) fail("--reason is one sentence of 10 to 300 characters; it is public");
const date = typeof options.date === "string" ? options.date : today();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("--date is YYYY-MM-DD");

const file = resolve(typeof options.file === "string" ? options.file : "revoked.json");
const list = existsSync(file) ? readJson(file) : { version: 1, revoked: [] };
if (list.version !== 1 || !Array.isArray(list.revoked)) fail(`${file} is no revocation list of version 1`);
if (list.revoked.some((r) => r.sha256 === sha256)) fail(`${sha256} is revoked already`);
list.revoked.push({ sha256, id, version, date, reason });
writeJson(file, list);
console.log(`revoked ${id} ${version} (${sha256})`);

// The catalogue next to it: an entry for exactly this file goes.
const catalogFile = join(dirname(file), "catalog.json");
if (existsSync(catalogFile)) {
  const catalog = readJson(catalogFile);
  if (Array.isArray(catalog.plugins) && catalog.plugins.some((p) => p.sha256 === sha256)) {
    catalog.plugins = catalog.plugins.filter((p) => p.sha256 !== sha256);
    writeJson(catalogFile, catalog);
    console.log(`removed ${id} ${version} from ${catalogFile}`);
  }
}
console.log("Still to do: delete the file from its GitHub release, and copy the hash into the server's REVOKED_PLUGIN_HASHES before its next release (AGENTS.md).");
