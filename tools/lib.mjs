/**
 * What the tools of this repository share. Plain Node, no dependencies: the workflows run them without an install.
 * Nothing here (or anywhere in this repository) ever runs a submitted plugin; files are read as text only.
 */
import { readFileSync, writeFileSync } from "node:fs";

/** A plugin's id as the server's manifest takes it (`PLUGIN_ID_PATTERN` in packages/protocol/src/plugins.ts). */
export const ID_RE = /^[a-z][a-z0-9-]{2,31}$/;
export const VERSION_RE = /^\d{1,5}\.\d{1,5}\.\d{1,5}$/;
export const KINDS = ["official", "reviewed"];
export const REPO_URL = "https://github.com/danielklessa/squorli-plugins";

/** `--name value` pairs and what stands before them. A flag without a value is `true`. */
export function parseArgs(argv) {
  const positional = [], options = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) options[a.slice(2)] = true;
      else { options[a.slice(2)] = next; i++; }
    } else positional.push(a);
  }
  return { positional, options };
}

export function readJson(file) {
  const text = readFileSync(file, "utf8");
  return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
}
/** Two spaces and a newline at the end, so a rewritten file differs only where its content does. */
export function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** -1, 0 or 1 for two versions of the form 1.2.3. */
export function compareVersions(a, b) {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

/** Control characters, line and paragraph separators and the marks that turn the direction of text around. */
const isControl = (c) => c <= 0x1f || (c >= 0x7f && c <= 0x9f) || c === 0x2028 || c === 0x2029 || (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069);
/** A text with every such character replaced by a space: one line that cannot draw over what stands around it. */
export function oneLine(value) {
  let out = "";
  for (const ch of String(value ?? "")) out += isControl(ch.codePointAt(0)) ? " " : ch;
  return out.trim();
}

/** Text for a Markdown table cell or a log line when it came from a submitted file: one line, nothing that formats. */
export function plain(value, max = 200) {
  const text = oneLine(value).replace(/[<>`|*_[\]\\]/g, (c) => `\\${c}`);
  return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}
