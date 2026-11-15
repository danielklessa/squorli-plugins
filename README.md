# Squorli plugins

Plugins for [Squorli Server](https://github.com/danielklessa/squorli) that carry Squorli's signature: the source of each one as it was read, and the place where authors submit a plugin to have it signed.

Deutsch: Hier reichen Entwickler Plugins für Squorli Server ein, damit Squorli sie prüft und signiert. Die Anleitung für Plugins steht unter https://squorli.com/de/docs/plugins/, die Liste der signierten Plugins unter https://squorli.com/de/plugins/.

- The guide for plugin authors: https://squorli.com/en/docs/plugins/
- The interface a plugin sees: [`packages/plugin-api/index.d.ts`](https://github.com/danielklessa/squorli/blob/main/packages/plugin-api/index.d.ts)
- The signed plugins, with what each one asks for: https://squorli.com/en/plugins/

## Why a plugin is signed

A Squorli server runs plugins itself, each in a sandbox: a plugin sees the JavaScript language and the object `squorli`, and nothing else. What it may do is what the server's owner confirms when switching it on (its capabilities) and what an admin picks in its settings (the roles and channels it may touch). Any plugin file can be installed that way, signed or not.

One capability is different. `net.fetch` (interface version 2, server 0.15.0 and later) lets a plugin fetch from the internet with `squorli.net.get`, from the hosts its manifest names. A plugin that reads messages or the member list and may also talk to the outside could carry them out, and a server's owner cannot be expected to read a plugin's source to rule that out. So a server grants `net.fetch` **only to a plugin file that carries Squorli's signature**: Squorli has read that file. An operator can switch the network off for all plugins (`PLUGIN_NET=false`), but cannot switch the signature off.

A plugin without the network needs no signature. It may be submitted all the same; signed, a server shows it with the mark "Von Squorli geprüft" (reviewed by Squorli).

## What the signature says, and what it does not

There are two kinds, and a server shows which one a plugin carries:

- **official**: Squorli's own plugin.
- **reviewed**: somebody else's plugin. Squorli read the source of exactly this version and found that it does what its description and its README say, asks for no more than it uses, and fetches only what it names.

A signature covers the whole file: the code and the manifest with its capabilities, hosts, author and version. One changed character and it no longer holds, so every new version is read and signed again.

It does **not** say that the plugin is free of mistakes, that Squorli maintains it, or that Squorli answers for it. The author stays responsible for the plugin. The full text and the list a reviewer works through are in [REVIEW.md](REVIEW.md).

## How to submit a plugin

1. Write the plugin as the [guide](https://squorli.com/en/docs/plugins/) describes and try it on a server of your own. A plugin that asks for `net.fetch` cannot be installed unsigned, so try it out first without the network part, or with the sources played by your own test (the server repository's `game-news.test.ts` shows how).
2. Fork this repository and add a folder `plugins/<id>/`, named like the `id` of your manifest, with two files:
   - `<id>.ts` or `<id>.js`: the plugin, as you wrote it. Not bundled, not minified, without a signature.
   - `README.md`: what the plugin does and, for **every host** in its manifest, what it asks there, what the request's address carries and why it needs that host. [plugins/game-news/README.md](plugins/game-news/README.md) is an example.
3. Name the licence in the plugin file with a line `// SPDX-License-Identifier: <licence>` near its top. Accepted: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, GPL-3.0-or-later, AGPL-3.0-or-later. The source is published here, and servers install the file, so it must be yours to license.
4. Open a pull request, one plugin per pull request, and fill in its checklist. A check runs at once: it reads your file with the server's own code (the manifest, the types, a compile; it never runs the plugin) and holds it against the rules above. Its summary shows what your plugin asks for.
5. Squorli reads the plugin ([REVIEW.md](REVIEW.md)). Expect questions and requests for changes in the pull request. There is no promise of a date and no claim to a signature.
6. When the pull request is merged, the plugin is signed and published: the signed file is the one asset of the release `<id>-v<version>` of this repository, and the plugin appears in [the catalogue](https://squorli.com/en/plugins/).

**An update is a new pull request.** Raise the manifest's `version`, change the file in your folder and say what changed. The review reads the difference to the signed version, so small, clear changes are signed sooner.

## How to install a signed plugin

Download the file from its release (the link in the [catalogue](https://squorli.com/en/plugins/) or under [Releases](https://github.com/danielklessa/squorli-plugins/releases)) and upload it in Verwaltung > Plugins of your server, or run `squorli plugin add <file>` on the machine. The server checks the signature itself with the key it carries; nobody has to compare hashes by hand. Before you switch the plugin on, the server shows what it asks for, the hosts included.

Do not edit a signed file. A server refuses a file whose signature does not hold, whatever it asks for.

## Taking a signature back

When a signed version turns out to do harm, Squorli revokes it: the version is listed in [`revoked.json`](revoked.json), its file is removed from the release and the catalogue, and the next release of Squorli Server carries the list. A server refuses a revoked file at installation and stops a revoked plugin that is installed.

The limit of this: a server asks nobody, so it **learns of a revocation with its next update** and not before. Until then a revoked version keeps running there. Servers that update automatically (`squorli autoupdate on`) are the quickest.

## What is in this repository

| Path | What |
|---|---|
| `plugins/<id>/` | The source of each plugin as it was submitted and read, unsigned, with its README. |
| `catalog.json` | The signed plugins, each with its newest signed version. The website's catalogue is made from it. |
| `revoked.json` | The signatures that were taken back. |
| `REVIEW.md` | What a review looks at, and what the signature says. |
| `tools/`, `.github/workflows/` | The check of a pull request and the signing workflow. They are under the [Apache License 2.0](LICENSE); each plugin is under the licence it names. |

The key that signs exists only as a secret of this repository's signing workflow, which waits for the owner's approval at every run. Its public half is in the server ([`tools/squorli-plugins.pub`](https://github.com/danielklessa/squorli/blob/main/tools/squorli-plugins.pub)); anybody can check a signed file with [`tools/plugin-sign.mjs`](https://github.com/danielklessa/squorli/blob/main/tools/plugin-sign.mjs): `node plugin-sign.mjs verify <file> --pub squorli-plugins.pub`.
