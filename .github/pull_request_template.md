<!--
Submitting a plugin, or a new version of one, for Squorli's signature. Read README.md ("How to submit a plugin") and
REVIEW.md first. One plugin per pull request. For anything else (tools, documentation) delete this template.
-->

**Plugin:** `plugins/<id>/` · version `x.y.z` · new plugin / update of the signed version `x.y.z`

**What it does, in two sentences:**

**What changed since the signed version** (updates only):

## Before you open the pull request

- [ ] The folder holds the plugin file `<id>.ts` or `<id>.js` and a `README.md`, nothing else, and the folder's name is the manifest's `id`.
- [ ] The file is the source as I wrote it: not bundled, not minified, no signature comment at its end.
- [ ] A line `// SPDX-License-Identifier: <licence>` names an open-source licence, and I may license this code.
- [ ] The manifest asks for no capability the code does not use, and names no host the code does not ask.
- [ ] The README says for every host what is asked there and why, and what the request's address carries.
- [ ] No member data and no message contents leave the server in a request's address, or the README says exactly which and why.
- [ ] Text that comes from outside is cleaned before it is posted (no mentions, no formatting, no foreign links).
- [ ] A source that is down or answers something unexpected does not make a handler fail.
- [ ] I kept to the terms of every source (attribution, request limits).
- [ ] The version in the manifest is higher than the signed one (updates).

I understand what Squorli's signature says and does not say (REVIEW.md), that Squorli may decline or take a signature back, and that I stay responsible for my plugin.
