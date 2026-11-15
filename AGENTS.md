# AGENTS.md – squorli-plugins

Working guide for AI agents and developers. `CLAUDE.md` only imports this file. Whoever changes the structure, a tool, a workflow or a rule updates this file in the same step. Documentation here is English (the workspace's rule; this repository is public, so everything in it is written for outside readers too).

## 1. What this repository is

The public place where plugins for Squorli Server are **submitted, read and signed** (begun 15 November 2026, the user's wish: "plugin Entwickler sollen auch Plugins zum signieren einreichen können"). A Squorli server grants the capability `net.fetch` (a plugin fetching from the internet, interface version 2, server 0.15.0) only to a plugin file that carries Squorli's signature; this repository is where that signature is made. The server's side (what a signature is, how it is checked, the keys it trusts) lives in `../squorli-server`: `docs/features/plugins.md`, `apps/server/src/plugins/signature.ts` and `signingKeys.ts`, `tools/plugin-sign.mjs`.

GitHub is this repository's home: `https://github.com/danielklessa/squorli-plugins`. Unlike the other Squorli projects it is **not a mirror of GitLab**: outside authors open pull requests here, and the signing key lives in a GitHub environment here.

**State on 15 November 2026: published, the first plugin signed.** `game-news` 1.0.0 was signed as `official` in the first run of "Sign a plugin" (release `game-news-v1.0.0`, catalogue commit e3a1c23); **that run did not wait for an approval, because the environment `signing` had no required reviewer yet: it must have one.** The repository exists on GitHub since that day, the key exists since that day (its public half is in the server repository, id `2026-11`), `SERVER_REF` named the server commit that carried it (68e1b36, the first value), and `REVIEW.md` is a draft the user still has to read. The tools were tried locally with a throwaway key (section 7). **Since the evening of that day this repository is the home of `game-news`** (version 1.1.0: the games as a list of the settings, cards) **and of its tests**, by the user's decisions: the plugin does not ship with the server, and its test tools belong here so that the server repository holds nothing of it.

### The user's decisions (15 November 2026)

1. A plugin key of its own (Ed25519), private half only as the secret `PLUGIN_SIGNING_KEY` of the GitHub environment `signing`, approval at every run. Never the release key.
2. Authors submit by pull request in a public repository of its own (this one).
3. Signed plugins are the releases of this repository and are also listed on a page of squorli.com (`/de/plugins/`, `/en/plugins/`).
4. Squorli's own game news plugin ships with the server and is also a download here. **Changed by the user the same day:** it does not ship with the server; installing it from this repository (the catalogue in Verwaltung > Plugins) is enough.
5. The plugin's tests and the tools they need live here too ("ich würde dann auch gerne die Testwerkzeuge in das Repo verlagern, damit es pure bleibt"): the server repository stays free of a plugin it does not ship.
6. A test lies next to its plugin, and **a submission must bring one** ("ich denke der Test darf im Plugin Repo auch gerne direkt neben dem Plugin liegen, es sollte auch zur Bedingung gemacht werden wenn man ein Plugin einreicht, dass ein entsprechender Test dabei ist").

### Decisions made by Claude (in the plan the user approved on 15 November 2026)

- Two kinds of signature, `official` (Squorli's own) and `reviewed` (somebody else's, read by Squorli); the kind is part of what is signed.
- Everything is signed here, the server's own plugin too: one key, one workflow, one list of what was signed.
- A signature is taken back through a list that travels with the server's release (`revoked.json` here, `REVOKED_PLUGIN_HASHES` there); servers ask nobody, so a revocation reaches a server with its next update.
- Submitted plugins need an open-source licence; the tooling here is under Apache-2.0 like the server.
- Plugins without the network may be submitted and signed too.

### Decisions made by Claude while building (15 November 2026, not confirmed by the user)

- **The licence is named as an SPDX line** in the plugin file (`// SPDX-License-Identifier: MIT`), from a fixed list of eight (`LICENCES` in `tools/check-submission.mjs`); a LICENSE file in the folder is allowed besides.
- **A pull request's check uses the base branch's tools, `SERVER_REF` and catalogue**, never the pull request's own (section 4).
- **A published signed file is never replaced:** a second signing run for the same version must produce the very same bytes (Ed25519 signatures are deterministic), or it stops. A changed plugin needs a new version.
- **Guards in the signing workflow:** `official` only for a manifest whose author is "Squorli", `reviewed` never for one.
- **The release's title is `<id> <version>`**, not the plugin's name (which is somebody else's text); the name stands in the release's text, written as plain text.
- **A revocation also removes the catalogue's entry** when it is about that very file (`tools/revoke.mjs`).
- **"Readable source" is measured:** no line over 2000 characters, at most 300 on average.
- **The catalogue holds one entry per plugin**, its newest signed version; older versions stay as releases.

## 2. Structure

```
plugins/<id>/<id>.ts|.js   a plugin as it was submitted and read: UNSIGNED, the manifest's id = the folder's name
plugins/<id>/<id>.test.ts|.js  its test: the plugin run in the server's sandbox against a host the test plays. Required
plugins/<id>/README.md     what it does and, per host of its manifest, what is asked there and why
catalog.json               the signed plugins, one entry each (the newest signed version); written by the signing workflow.
                           The website copies it (squorli-website: `pnpm catalog:sync`). Format: section 3
revoked.json               signatures taken back; the source of REVOKED_PLUGIN_HASHES in the server. Format: section 3
SERVER_REF                 one line: the full commit SHA of danielklessa/squorli whose tools/plugin-sign.mjs, public key and
                           plugin check the workflows use. Forty zeros = not set yet, both workflows stop with a sentence
KEY_ID                     one line: the name of the plugin key the workflow signs with (`2026-11`); the server knows the
                           key under this name (PLUGIN_SIGNING_KEYS)
README.md                  for authors and server owners: why a plugin is signed, how to submit, how to install, revocation
REVIEW.md                  what a review looks at and what the signature says. A DRAFT until the user has read it
.github/workflows/check.yml  the check of a pull request and of main (section 4)
.github/workflows/sign.yml   the signing workflow (section 5)
.github/pull_request_template.md  the author's checklist
tools/lib.mjs              shared: argument parsing, JSON files, version comparison, `plain` (foreign text as plain text)
tools/list-plugins.mjs     the plugin files of the repository, or of the folders a pull request touched; the one place that
                           reads file names of a pull request
tools/check-submission.mjs the rules of this repository on top of the server's check (folder, file name, no signature,
                           licence, readable source, hosts named in the README, version above the signed one)
tools/summary.mjs          what the checked plugins ask for, as a Markdown table for a workflow's summary
tools/release-notes.mjs    the text of a signed plugin's release; `--field version|author|file` for the workflow
tools/update-catalog.mjs   writes a freshly signed plugin into catalog.json, after verifying the signed file
tools/revoke.mjs           appends a signed version to revoked.json (and drops it from the catalogue)
tools/test.mjs             typechecks the TypeScript plugins against the interface a plugin sees and runs the plugins' tests,
                           both with a checkout of the server (its compiler, its test runner, its sandbox): section 7
tools/testing/server.ts    what a test borrows from the server's source by path: PluginRunner, readPluginFile, checkValues,
                           netAllowed, settingsCheckAnswer and the worker file. The one place that names server internals
tests/<id>.test.ts         tests of the plugins Squorli maintains here (game-news). Not inside plugins/<id>/: that folder
                           holds exactly one plugin file, and the submission rules count every .ts there
LICENSE                    Apache License 2.0, for the tools and workflows; each plugin is under the licence it names
```

No package.json and no dependencies: every tool is plain Node (`node tools/<name>.mjs`), so a workflow runs it without an install. The only install the workflows make is the server's own (`pnpm install` in its checkout), for its plugin check; the tests and the typecheck use that same checkout (`tools/test.mjs` starts the server's `vitest` and `tsc` with the server's folder as the working directory), so they add no dependency here either.

`plugins/game-news/` is Squorli's own plugin and **this repository is its home** (until the evening of 15 November 2026 it lay in the server repository, `apps/server/plugins/`, and shipped with the server; the server holds nothing of it any more). Change it here, run `node tools/test.mjs`, raise the version in its manifest, and sign: the signed file is this repository's release and reaches servers through the catalogue. The website's plugin guide cuts its excerpts out of this file (`../squorli-website`: `pnpm plugins:sync` after a change, its `tools/verify-site.mjs` names the lines it looks for).

## 3. The two lists

`catalog.json`, sorted by `id`, two spaces, a newline at the end:

```json
{ "version": 1, "plugins": [ {
  "id": "game-news",
  "name": { "en": "Game news", "de": "Spiele-News" },
  "description": { "en": "…", "de": "…" },
  "author": "Squorli", "homepage": "https://…",          // or null
  "kind": "official",                                     // or "reviewed"
  "version": "1.0.0", "apiVersion": 2,
  "capabilities": ["messages.write", "net.fetch"],
  "hosts": ["api.steampowered.com"],                      // [] without the network
  "language": "ts", "file": "game-news.ts",
  "sha256": "<SHA-256 of the file without its signature comment, as plugin:check and plugin-sign.mjs hash print it>",
  "key": "2026-11", "signedAt": "2026-11-15",
  "download": "https://github.com/danielklessa/squorli-plugins/releases/download/game-news-v1.0.0/game-news.ts",
  "source": "https://github.com/danielklessa/squorli-plugins/tree/main/plugins/game-news"
} ] }
```

`name`, `description` and `author` are the author's texts: whoever shows them (the website) shows them as text, never as markup.

`revoked.json`: `{ "version": 1, "revoked": [ { "sha256", "id", "version", "date": "YYYY-MM-DD", "reason" } ] }`. `reason` is one public sentence.

Both formats are fixed: the website and the server's release step read them. A change of either is a change in three repositories.

## 4. The check (`check.yml`)

Runs on every pull request that touches `plugins/` and on every push to main. `permissions: contents: read`, no secret, no environment.

1. Two checkouts: `trusted/` = the base branch (on a push: the commit itself), `submission/` = the pull request merged into the base.
2. `SERVER_REF` is read from `trusted/`, and danielklessa/squorli is checked out at that commit into `server/`, its dependencies installed as the server's CI does.
3. `trusted/tools/list-plugins.mjs` names the plugin files of the folders the pull request touched (on a push: all).
4. The server's own check reads them: `pnpm exec tsx src/plugin-check.ts <files>` in `server/apps/server` (the manifest as the server parses it, the types taken off, a compile in the sandbox, the signature). Its JSON goes to a file, and `tools/summary.mjs` prints what each plugin asks for into the run's summary.
5. `trusted/tools/check-submission.mjs` applies this repository's rules, with the catalogue of `trusted/`.

6. A second job, `test`: `trusted/tools/test.mjs` typechecks the plugins of `submission/` against the interface and runs the tests they bring, with the server checkout. **This is the one place where something of a pull request runs**, and it is built for that: a job of its own, no secret, a read-only token, no cache, the server's dependencies installed before anything of the pull request runs, and nothing it leaves behind is read by `check`, by `sign.yml` or by anybody. The test tool comes from `trusted/`; the tests and the helper they import come from the pull request, which is the point.

**Rules for changing it:** never `pull_request_target`, never a secret, never a step in the job `check` that runs something out of `submission/` (no `node submission/...`, no install there), never a step after the tests that publishes, uploads or caches what that job holds, and never the tests in `sign.yml`'s job `sign`. A pull request is somebody else's content; the tools that judge it come from the base branch, which is why a change to a tool is not tested by its own pull request (try it locally, section 7).

## 5. Signing (`sign.yml`)

Started by hand from main with the plugin's id and the kind. **Four jobs, so that the key is never in a job that installed anybody's packages** (reworked the day it was written, 15 November 2026: the first version signed in the one job that had run `pnpm install` for the server's check, where a package's install script could have left a process waiting for the key file):

1. **`check`** (no environment, no secret, read-only token): the inputs are checked (they reach scripts through the environment only), the same check as a pull request, the guards for `official`/`reviewed`. Its summary names what will be signed; it is what the owner reads before approving the next job.
2. **`sign`** (the only job in the environment `signing`: required reviewer = the owner, deployment branches = main only, the secret `PLUGIN_SIGNING_KEY`): two checkouts and `actions/setup-node`, then `server/tools/plugin-sign.mjs sign` into `out/` (the key is written to the runner's temp folder with `umask 077` and removed, once more in an `always()` step) and `verify` with `server/tools/squorli-plugins.pub`. **No package manager, no install and no cache in this job, ever**; the signing tool uses Node's own modules only. The signed file leaves as the artifact `signed`.
3. **`verify`** (no secret, read-only token; it installs the server's dependencies): the server's check on the signed file must say `valid` with the right kind, so a file no server would take is never published. Its result and the release's text leave as the artifact `verified`.
4. **`publish`** (the only job whose token may write; it installs nothing): the signature is verified once more on what was downloaded, then the release `<id>-v<version>` with the signed file as its one asset, the catalogue's entry as one commit on main, and the signature line and the hash in the run's summary.

What passes between the jobs (the server commit, the key's name, the file name, the version) is checked again by every job that uses it, against the same whole-string patterns.

### Releasing a plugin, in order

1. The plugin's pull request is read (REVIEW.md) and merged.
2. Actions > "Sign a plugin" > Run workflow, branch main, the id, the kind. The owner approves the run.
3. The release and the catalogue's commit exist. In `../squorli-website`: `pnpm catalog:sync`, check, push (the catalogue page shows it after the deploy).
4. Nothing goes back into the server repository (until 15 November 2026 the signed `game-news` did: it shipped with the server then). A plugin that needs a newer plugin interface than released servers have is signed only when that server release is out or about to be: the catalogue lists one version per plugin, and servers before it show the entry as "needs a newer server".

### When the catalogue commit is refused

The release exists by then; only `catalog.json` is missing its entry (a branch rule on main, or main moved twice). Either allow GitHub Actions to push to main for this one file (a ruleset bypass), or by hand: download the release's file, then in a checkout of the server at `SERVER_REF` run `pnpm exec tsx src/plugin-check.ts <signed file> > signed.json` (in `apps/server`), and here `node tools/update-catalog.mjs --check signed.json --kind <kind> --signed <signed file> --pub <server>/tools/squorli-plugins.pub --tool <server>/tools/plugin-sign.mjs --date <the day of the release>`; commit `catalog.json` through a pull request.

### Taking a signature back

`node tools/revoke.mjs <id> <version> --sha256 <hash> --reason "<one public sentence>"`, commit `revoked.json` (and `catalog.json` when it changed), delete the file from its release, run `pnpm catalog:sync` in the website, and copy the hash into `REVOKED_PLUGIN_HASHES` (`../squorli-server/apps/server/src/plugins/signingKeys.ts`) before the next server release. Say plainly to whoever asks: servers learn of it with their next update.

## 6. `SERVER_REF` and `KEY_ID`

- **`SERVER_REF`** also decides which server the tests run against: `tools/testing/server.ts` imports five functions and the worker file from the server's source by path, so a server commit that renames or moves one of them needs that file changed in the same commit that raises `SERVER_REF` (the server's `apps/server/AGENTS.md` names them as a contract). It is raised by a commit here whenever the server's plugin check, `tools/plugin-sign.mjs` or the trusted keys change, and at least with every server release that changes the plugin interface: a plugin written for a newer interface version is refused ("update the server") by a check that runs an older server. Always a full commit SHA of danielklessa/squorli's main, never a branch name. The first value is set when the server commit that carries the key is on GitHub.
- **`KEY_ID`** changes only when the plugin key is replaced: the server then carries the old and the new key in `PLUGIN_SIGNING_KEYS` for one release, `tools/squorli-plugins.pub` there becomes the new key (the workflow verifies against it), the secret here is replaced, `KEY_ID` gets the new name, every plugin of the catalogue is signed again, and a later server release drops the old key. `docs/features/release-signing.md` of the server records it.

## 7. Trying the tools locally

Nothing here needs GitHub except the workflows themselves. From PowerShell (pnpm), with the server repository next to this one:

```
# the server's check on a plugin of this repository (from ../squorli-server/apps/server)
pnpm exec tsx src/plugin-check.ts ..\..\..\squorli-plugins\plugins\game-news\game-news.ts > check.json
# this repository's rules (from here)
node tools/check-submission.mjs <path>\check.json --base .
node tools/summary.mjs <path>\check.json
```

The typecheck and the tests (the server repository next to this one with `pnpm install` done there, or `--server <path>`): `node tools/test.mjs`; `--no-typecheck` or `--no-tests` for one of the two, and what follows `--` goes to the test runner (`node tools/test.mjs -- -t "card"`). A plugin's test lies next to it (`plugins/<id>/<id>.test.ts`), imports from `../../tools/testing/server` and nothing else of the server; `--repo <path>` runs the plugins of another checkout.

The signing path with a **throwaway key** in a scratch folder, never in a repository: `openssl genpkey -algorithm ed25519 -out key.pem`, `openssl pkey -in key.pem -pubout -out key.pub`, `node ../squorli-server/tools/plugin-sign.mjs sign <copy> --key key.pem --key-id test --kind reviewed --out out/<id>.ts`, `... verify out/<id>.ts --pub key.pub`. The server only reads such a signature as valid when it trusts the key; for `update-catalog.mjs` on a copy of the catalogue, hand it a check result whose `signature` you set to `{ "status": "valid", "key": "test", "kind": "reviewed" }` (the workflow gets the real one from the server at `SERVER_REF`). Always pass `--catalog <copy>` / `--file <copy>`: the real `catalog.json` and `revoked.json` are written by the workflow and by a deliberate revocation only.

Checked on 15 November 2026 (locally, Node 24 on Windows): section 9.

## 8. Rules and pitfalls

- **A submitted plugin runs in one place only: inside the sandbox, started by its own test, in the workflow job `test`.** Everywhere else files are read as text; the server's check parses and compiles, it does not execute. A tool or another workflow step that would evaluate a plugin or a pull request's test (import it, `node` it, install something a pull request names) is a security hole, not a convenience. A first-time contributor's workflow run waits for a maintainer's approval (GitHub's setting for this repository): read the test before approving, it is a program.
- **The key exists only as the environment's secret, and only the job `sign` sees it.** Never add a step to that job that installs or runs anything but the pinned actions and `server/tools/plugin-sign.mjs`: a package's install script that leaves a process behind could read the key file. Whatever needs dependencies belongs into `check` or `verify`. No key file in the repository, in an artifact, in a log; `.gitignore` refuses `*.pem`. The public half is not kept here either: the workflow takes it from the server at `SERVER_REF`, so the key that verifies is the one servers carry.
- **Inputs and file names are somebody else's text.** Workflow inputs go through `env:` and are matched with bash's `[[ =~ ]]` against a whole-string pattern (never `grep`, which matches per line); file names of a pull request are read by `list-plugins.mjs` only. No `${{ … }}` expression of a pull request's or an input's content inside a `run:` script.
- **Texts of a manifest are shown as text.** `plain()` in `tools/lib.mjs` for anything that goes into Markdown (a summary, a release's text).
- **The signature covers one form of the file** (no byte order mark, `\n` line ends, nothing blank at the end), so Windows line ends do not break it; `.gitattributes` keeps every checkout at `\n` anyway. The hash in the catalogue is of that form without the signature comment: it is the same for the unsigned file in `plugins/` and the signed one in the release.
- **A pull request cannot test a change to the tools or to `SERVER_REF`**: its check runs the base branch's. Try such a change locally and watch the push run on main.
- **Pushes made by the workflow's own token start no workflow**, so the catalogue's commit is not checked by `check.yml`; the next push to main checks everything again (an unchanged signed plugin passes because its hash is the catalogue's).
- **The workspace's rule on commit messages applies here too:** no tool or assistant names itself in a commit or a pull request.

## 9. Checked and not checked

Checked locally on 15 November 2026: every `.mjs` with `node --check`; both workflows parse as YAML and hold no input or pull request expression inside a `run:` script; the server's `plugin:check` on `plugins/game-news/game-news.ts` and this repository's rules on its result; ten wrong submissions in a scratch folder each refused with its sentence, next to one that is accepted (a file that carries a signature, a folder named otherwise than the id, a manifest that is not valid, no README, a host the README does not name, no licence, a licence outside the list, minified code, a second file in the folder, a version not above the signed one); `list-plugins.mjs` with a pull request's changed paths, hostile folder names and a removed folder included; the signing path with a throwaway key (sign, verify, the same bytes at a second signing, the catalogue on a copy, a second run leaving the day it was first signed, the wrong kind, a file changed after signing, a revocation on a copy that also empties the catalogue copy, the release's text).

On GitHub the same day: `check.yml` on the first push (the server checked out by commit SHA, its dependencies installed, `game-news` passed) and `sign.yml` for `game-news` as `official` (all four jobs, the artifacts from job to job, the release, the catalogue's commit pushed by the workflow's token); the downloaded release file verifies against the server's public key.

After the plugin's move here (15 November 2026): `node tools/test.mjs` (the plugin fits the server's declaration; 27 tests pass in the server's sandbox, Node 24 on Windows), `plugin-check.ts` and `check-submission.mjs` on version 1.1.0.

The rule that a plugin brings its test: `check-submission.mjs` passes for `game-news` with its test and refuses the same folder without it.

**Not checked:** the job `test` of `check.yml` before its first push (it cannot run locally; read the push's run), a pull request from a fork with a test of its own, the approval of the environment `signing` (it had no required reviewer at the first run), a second signing run for the same version, a revocation. The first real run is the signing of `game-news`; read its log line by line.
