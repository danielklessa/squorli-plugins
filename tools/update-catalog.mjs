#!/usr/bin/env node
/**
 * Writes a freshly signed plugin into catalog.json (its one entry: the newest signed version).
 *
 *   node tools/update-catalog.mjs --check <plugin:check JSON of the SIGNED file> --kind official|reviewed
 *        --signed <signed file> --pub <public key PEM> [--tool <plugin-sign.mjs>] [--date YYYY-MM-DD] [--catalog <file>]
 *
 * `--tool` = the server repository's tools/plugin-sign.mjs (default: `$SERVER_DIR/tools/plugin-sign.mjs`). The signed file
 * is verified with it and the public key before anything is written: a catalogue entry always names a file whose signature
 * holds. `--catalog` = another file than ./catalog.json (for trying this out on a copy).
 *
 * Run by the signing workflow. By hand only when that workflow could not push its commit (AGENTS.md, "When the catalogue
 * commit is refused"): download the release's file, run `plugin:check` on it in the server repository, then this.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ID_RE, KINDS, REPO_URL, VERSION_RE, compareVersions, fail, parseArgs, readJson, today, writeJson } from "./lib.mjs";

const { options } = parseArgs(process.argv.slice(2));
for (const name of ["check", "kind", "signed", "pub"]) if (typeof options[name] !== "string") fail("usage: update-catalog.mjs --check <JSON> --kind official|reviewed --signed <file> --pub <pem> [--tool <plugin-sign.mjs>] [--date YYYY-MM-DD] [--catalog <file>]");
const kind = options.kind;
if (!KINDS.includes(kind)) fail(`--kind is one of ${KINDS.join(", ")}`);
const date = typeof options.date === "string" ? options.date : today();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("--date is YYYY-MM-DD");
const toolFile = typeof options.tool === "string" ? options.tool : process.env.SERVER_DIR ? join(process.env.SERVER_DIR, "tools", "plugin-sign.mjs") : null;
if (!toolFile || !existsSync(toolFile)) fail("the server repository's tools/plugin-sign.mjs is needed: name it with --tool or set SERVER_DIR");
const catalogFile = resolve(typeof options.catalog === "string" ? options.catalog : "catalog.json");

const signedFile = resolve(options.signed);
const report = readJson(options.check);
const entries = Array.isArray(report?.files) ? report.files : [];
if (entries.length !== 1) fail("--check must be the plugin:check result of exactly one file, the signed one");
const e = entries[0];
if (!e.ok) fail(`the server refuses the signed file: ${e.error}`);
if (typeof e.id !== "string" || !ID_RE.test(e.id) || typeof e.version !== "string" || !VERSION_RE.test(e.version)) fail("the check result names no plugin id and version");
if (basename(signedFile) !== `${e.id}.${e.language}`) fail(`the signed file must be named ${e.id}.${e.language}`);
if (e.signature?.status !== "valid" || e.signature?.kind !== kind) fail(`the server at this commit does not take the file as "${kind}" (signature: ${JSON.stringify(e.signature)})`);

const { verifySource } = await import(pathToFileURL(resolve(toolFile)).href);
const verified = verifySource(readFileSync(signedFile, "utf8"), readFileSync(options.pub, "utf8"));
if (!verified.ok) fail(`the signed file does not verify with ${options.pub}: ${verified.reason}`);
if (verified.kind !== kind || verified.hash !== e.hash) fail("the signed file and the check result are not about the same file");

const catalog = existsSync(catalogFile) ? readJson(catalogFile) : { version: 1, plugins: [] };
if (catalog.version !== 1 || !Array.isArray(catalog.plugins)) fail(`${catalogFile} is no catalogue of version 1`);
const before = catalog.plugins.find((p) => p.id === e.id);
if (before && before.sha256 !== e.hash && compareVersions(e.version, before.version) <= 0) fail(`the catalogue holds ${e.id} ${before.version} already; ${e.version} is not higher`);

const file = `${e.id}.${e.language}`;
const entry = {
  id: e.id,
  name: e.name,
  description: e.description,
  author: e.author ?? null,
  homepage: e.homepage ?? null,
  kind,
  version: e.version,
  apiVersion: e.apiVersion,
  capabilities: e.capabilities,
  hosts: e.hosts,
  language: e.language,
  file,
  sha256: e.hash,
  key: verified.keyId,
  // A run repeated for the same file keeps the day it was first signed.
  signedAt: before && before.sha256 === e.hash ? before.signedAt : date,
  download: `${REPO_URL}/releases/download/${e.id}-v${e.version}/${file}`,
  source: `${REPO_URL}/tree/main/plugins/${e.id}`,
};
catalog.plugins = [...catalog.plugins.filter((p) => p.id !== e.id), entry].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
writeJson(catalogFile, catalog);
console.log(`${before ? "replaced" : "added"} ${e.id} ${e.version} (${kind}, key ${verified.keyId}, sha256 ${e.hash}) in ${catalogFile}`);
