// Typechecks the plugins of this repository against the interface a plugin sees, and runs the test each plugin brings
// (plugins/<id>/<id>.test.ts or .js).
//
// This repository has no dependencies: both use a checkout of Squorli Server (danielklessa/squorli) with its dependencies
// installed, its compiler, its test runner and the sandbox plugins really run in.
//
//   node tools/test.mjs [--server <path>] [--repo <path>] [--no-typecheck] [--no-tests] [-- <arguments for the test runner>]
//
// The server is `--server`, else SQUORLI_SERVER, else ../squorli-server. `--repo` is the checkout whose plugins are meant
// (default: the one this file lies in); the workflow names a pull request's there. Tests are Node programs: the workflow
// runs them in a job of their own that holds nothing worth taking (AGENTS.md).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const rest = args.includes("--") ? args.slice(args.indexOf("--") + 1) : [];
const own = args.includes("--") ? args.slice(0, args.indexOf("--")) : args;
const at = own.indexOf("--server");
const repoAt = own.indexOf("--repo");
const repo = resolve(repoAt >= 0 && own[repoAt + 1] ? own[repoAt + 1] : join(dirname(fileURLToPath(import.meta.url)), ".."));
const server = resolve(at >= 0 && own[at + 1] ? own[at + 1] : process.env.SQUORLI_SERVER ?? join(repo, "..", "squorli-server"));
const app = join(server, "apps", "server");
if (!existsSync(join(app, "node_modules", "vitest", "vitest.mjs"))) {
  console.error(`No checkout of Squorli Server with its dependencies at ${server} (clone danielklessa/squorli next to this repository and run "pnpm install" there, or name it with --server).`);
  process.exit(1);
}
const run = (what, file, argv) => {
  // The server's own folder is the working directory: its worker threads find their loader (tsx) from there.
  const r = spawnSync(process.execPath, [file, ...argv], { cwd: app, stdio: "inherit", env: { ...process.env, SQUORLI_SERVER: server } });
  if (r.status !== 0) { console.error(`${what} failed`); process.exit(r.status ?? 1); }
};

if (!own.includes("--no-typecheck")) {
  // Every TypeScript plugin against the declaration a plugin sees (packages/plugin-api/index.d.ts), with the options the
  // server holds its own plugins to. Reading only: nothing of a plugin is run.
  const files = [];
  for (const dir of readdirSync(join(repo, "plugins"), { withFileTypes: true })) {
    // The plugin file itself, not its test: a test is a Node program and no plugin.
    if (dir.isDirectory() && existsSync(join(repo, "plugins", dir.name, `${dir.name}.ts`))) files.push(join(repo, "plugins", dir.name, `${dir.name}.ts`));
  }
  if (files.length) {
    const tmp = mkdtempSync(join(tmpdir(), "squorli-plugins-"));
    try {
      const api = join(server, "packages", "plugin-api");
      writeFileSync(join(tmp, "tsconfig.json"), JSON.stringify({ extends: join(api, "tsconfig.json"), files: [join(api, "index.d.ts"), ...files] }));
      run("typecheck", join(app, "node_modules", "typescript", "bin", "tsc"), ["-p", join(tmp, "tsconfig.json")]);
      console.log(`typecheck: ${files.length} plugin file(s) fit the interface of the server at ${server}`);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }
}
if (!own.includes("--no-tests")) run("tests", join(app, "node_modules", "vitest", "vitest.mjs"), ["run", "--root", repo, "--dir", join(repo, "plugins"), ...rest]);
