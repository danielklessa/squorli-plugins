# What a review looks at

> **DRAFT.** This text is not in force yet. Daniel Klessa, who operates Squorli and signs, has to read it and agree to its wording, the section "What the signature says" above all, before this repository is made public.

This is the list a plugin is read against before Squorli signs it. Authors read it beforehand, so a submission needs fewer rounds. It applies to every version: a new plugin is read whole, an update as the difference to the last signed version.

A check runs on every pull request before anybody reads anything: the server's own reading of the file (the manifest, the types taken off, a compile) and the formal rules of [README.md](README.md). What follows is what a person looks at.

## The source

- **One file, readable, as its author wrote it.** No bundled or minified code, no generated code without its source, no encoded or packed text that is unpacked at run time. Names and comments in English or German.
- **No code that comes from outside.** A plugin never builds code from text it fetched, stored or was sent: `eval`, `Function`, a string handed to anything that runs it. This is a refusal without discussion, because it would make the reviewed file a shell for code nobody read.
- **A licence the author may give**, named in the file (the list is in the README). Parts taken from elsewhere are named with their licence.
- **The manifest tells the truth.** Name, description and author say what the plugin is and whose it is. A plugin of somebody else never names "Squorli" as its author.

## What it asks for

- **No capability it does not use.** `messages.read` and `members.read` weigh most next to the network: a plugin that asks for them and for `net.fetch` must show in its README why it needs both, and where what it reads goes.
- **As few hosts as possible, each one justified** in the README: what is asked there, why this host and not another, whether the interface is documented by its operator.
- **Hosts whose operator is known.** No address shorteners, no free hosting where anybody can put a page, no host of the author's own unless that host is the plugin's purpose and the README says who runs it and what it keeps.

## What leaves the server

A plugin can send nothing but the address it asks: one GET, no headers of its own, no body. So the address is what a review reads.

- **No member data and no message contents in an address**: no names, ids, handles, texts, channel names, nothing about who is on the server or what is said there. The exception is a plugin whose declared purpose needs exactly that (a translation of a message a member asked for, say), and then the README states which data go to which host on whose action.
- **Nothing that identifies the server** beyond what the request itself gives away (its IP address): no server name, no per-server id made up by the plugin.
- **What a member typed** (a search word in a command) may go into an address when the member can see that from the command's description.

## What comes in

Everything a source sends is somebody else's text.

- **Before it is posted it is made plain:** nothing that mentions a member (`<@...>`), no formatting from outside, no link from outside. A link in a post is built by the plugin and checked against the host it must be on. `excerpt`, `line`, `esc` and `link` in [`plugins/game-news/game-news.ts`](plugins/game-news/game-news.ts) show one way.
- **Answers are read with doubt:** a field may be missing, of another type or absurdly long. Lengths are cut, numbers checked, and a shape the plugin does not know is an error it catches.
- **Regular expressions on foreign text are bounded:** nothing that can take long on a text built for it. The sandbox ends a plugin that runs too long, and five such failures suspend it.

## How it behaves

- **A source that is down does not fail a handler.** `net.get` rejects; the plugin catches that, says so in its log and goes on. One dead source never stops the others, and never the schedule.
- **It keeps inside the limits without leaning on them:** one request per event where it can, a pause between requests, far fewer than the thirty a minute a plugin may make. A plugin installed on many servers asks a source many times over; the review weighs that.
- **It does not flood a channel:** what existed before the plugin was switched on is not posted, and a round has a ceiling.
- **Nothing is posted twice** after a restart or when a job comes a second time.
- **It keeps to the terms of its sources:** attribution where it is asked for, request limits, no source that forbids this use. The README names the terms it relies on.

## An update

- The manifest's `version` is higher, and the pull request says what changed and why.
- New capabilities and new hosts are read as in a first submission. A server stops an updated plugin that asks for more until its owner confirms; the review asks whether the more is needed.
- Unrelated changes in the same pull request (a rewrite next to a fix) make the difference hard to read and are sent back to be split.

## What the signature says

Squorli signs a file when the reading above found nothing against it. The signature then says: **Squorli read the source of this version, and to the reader's judgment it does what its description and its README say, asks for no more than it uses, and fetches only what it names.**

It says nothing more. In particular:

- **No warranty.** The signature is no promise that the plugin is free of mistakes, safe in every situation or fit for a purpose. A review is a reading by a person, not a proof.
- **No continuing supervision.** Squorli does not watch what the plugin's sources do later, does not maintain the plugin and does not owe updates. What a source answers tomorrow is beyond any review.
- **The author stays responsible** for the plugin, its licence and its use of its sources. Whoever installs a plugin on a server decides to run it there.
- **There is no claim to a signature.** Squorli may decline a plugin or a version without giving reasons, and has no deadline.
- **Squorli may take a signature back** when a signed version turns out to do harm, to break these rules or to rest on false statements: the version is listed in `revoked.json`, and servers stop it with their next update. The author is told in the plugin's pull request or in an issue.

A plugin signed as **official** is Squorli's own; for it the sentence above is Squorli's statement about its own work, and the limits are the same.
