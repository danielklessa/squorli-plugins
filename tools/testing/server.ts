// What a plugin's test needs of Squorli Server: the real sandbox a plugin runs in, the manifest's reading and the rules
// the server holds a plugin to. This repository has no dependencies of its own; a test borrows these from a checkout of
// the server (danielklessa/squorli), the one `tools/test.mjs` names in SQUORLI_SERVER: next to this repository on a
// developer's machine, at the commit of SERVER_REF in the workflow. The types come from the same files and are erased
// when a test runs, so an editor shows them only where `../squorli-server` exists.
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The root of the server's checkout. */
export const serverRoot = resolve(process.env.SQUORLI_SERVER ?? join(fileURLToPath(import.meta.url), "..", "..", "..", "..", "squorli-server"));
const src = (file: string): string => pathToFileURL(join(serverRoot, "apps", "server", "src", file)).href;

type Runner = typeof import("../../../squorli-server/apps/server/src/plugins/runner");
type Manifest = typeof import("../../../squorli-server/apps/server/src/plugins/manifest");
type Service = typeof import("../../../squorli-server/apps/server/src/plugins/service");
export type { InvocationContext } from "../../../squorli-server/apps/server/src/plugins/runner";

/** Runs a plugin in the server's sandbox (QuickJS in a worker thread); the test plays the host with `onCall`. */
export const { PluginRunner } = (await import(/* @vite-ignore */ src("plugins/runner.ts"))) as Runner;
/** `readPluginFile` = a file as an installation reads it; `checkValues` = a form's values against the manifest's fields. */
export const { readPluginFile, checkValues } = (await import(/* @vite-ignore */ src("plugins/manifest.ts"))) as Manifest;
/** `netAllowed` = may a plugin with these hosts ask this address; `settingsCheckAnswer` = how the server reads the answer to `settings.check`. */
export const { netAllowed, settingsCheckAnswer } = (await import(/* @vite-ignore */ src("plugins/service.ts"))) as Service;

/** What `new PluginRunner({ … })` needs to start the server's plugin worker from its TypeScript source. */
export const worker = { workerFile: join(serverRoot, "apps", "server", "src", "plugin-worker.ts"), execArgv: ["--import", "tsx"] };
