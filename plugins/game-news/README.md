# Game news

Squorli's own plugin (signed as `official`). It posts news into channels an admin picks: announcements and patch notes of the games a server follows on Steam, games that are free to keep right now, and new graphics drivers from NVIDIA and Intel. Every post is a card: the game or the source, the title as a link, the start of the text, a picture.

It does not ship with the server: it is developed here, its tests are [`game-news.test.ts`](game-news.test.ts) next to it (they run it in the server's real sandbox against sources the test plays; `node tools/test.mjs`), and the signed file of this repository's release is what a server installs from the catalogue (Verwaltung > Plugins > "Katalog öffnen").

Everything is set in the plugin's settings; it has no commands. The games are a list there (interface version 2, field type `list`): per entry a name, a Steam number or the address of a store page, and whether all announcements or only patch notes are posted. Before the settings are saved the plugin looks every new entry up at Steam (event `settings.check`) and writes it as "Name (number)", or refuses the save with a sentence at the field when it finds nothing or several games fit.

## What it asks for

| Capability | Why |
|---|---|
| `messages.write` | It writes the news into the channels picked in its settings. |
| `net.fetch` | It reads the sources below. |

It reads no messages and no member list.

## Hosts

Every request is one GET without a key, an account or a cookie. Nothing about the server or its members is sent: the addresses carry a Steam game number, a game's name an admin typed into the settings' list, or the language of the plugin's settings (German or English, which Epic's list is asked in), and nothing else that varies.

| Host | What is asked there | Why |
|---|---|---|
| `api.steampowered.com` | `ISteamNews/GetNewsForApp` with the number of one followed game | The developers' announcements of that game. "Patch notes only" keeps to the entries Steam tags `patchnotes` or whose title says so. Steam's Web API, no key needed for this method. |
| `store.steampowered.com` | `api/storesearch` with the name typed into the list, `api/appdetails` with a game number | Finding a game by its name, and the name of a game given by its number or its store address, when the settings are saved (at most five lookups per save). And the address of a game's small picture: once per round for one game that has none yet or whose picture is older than two weeks. |
| `store-site-backend-static.ak.epicgames.com` | `freeGamesPromotions` | What the Epic Games Store gives away this week. Not documented by Epic; it may change without notice, and the plugin then says so in its log and goes on with the other sources. |
| `www.gamerpower.com` | `api/giveaways` for the platform PC | Giveaways on Steam, GOG and other stores. A documented, free interface; its terms ask for a link back, which every post from this source carries. |
| `gfwsl.geforce.com` | `AjaxDriverService.php`, the driver lookup of NVIDIA's own download page | The newest GeForce Game Ready driver for Windows. Not documented by NVIDIA; it may change without notice. |
| `www.intel.com` | The download page of the Intel Arc graphics driver for Windows (`/content/www/us/en/download/785597/…`) | The newest Intel Arc driver: its version and date stand in the page's head (`meta` tags), nothing else of the page is used. No interface Intel documents; it may change without notice. |

AMD's drivers are missing: AMD's website gives a program no answer, and the pages that list its drivers elsewhere forbid reading them by program.

Addresses the plugin only writes into a post (a game's page at `store.epicgames.com`, a driver's page at `www.nvidia.com`) are no hosts it fetches from and are not in its manifest. Since the plugin holds `net.fetch`, the server makes link previews for its posts, as it does for a member's message.

## Pictures

A card may carry two pictures. The plugin fetches none of them: it hands their addresses to the server with the card, the server fetches them itself (as it does for the pictures of link previews: public addresses only, pictures only, up to 2 MB) and serves its own copies, so no member's app asks a foreign host. Every address is either built by the plugin from ids on a fixed host or taken from a source's answer only when it is an https address of that source's own hosts:

| Picture | Address |
|---|---|
| The first picture of a Steam announcement | `https://clan.akamai.steamstatic.com/images/<group>/<hash>.<ext>`, built from the ids in the announcement |
| The still of an announcement's first video, when it has no picture | `https://i.ytimg.com/vi/<id>/mqdefault.jpg`, built from the video's id |
| A game's small picture | Steam's `capsule_image` or `tiny_image` from the lookups above, only an address of a host under `steamstatic.com` |
| Epic's offer | the offer's wide picture from Epic's list, only an address of a host under `epicgames.com` or `unrealengine.com` |
| A giveaway | GamerPower's `image`, only an address of `www.gamerpower.com` |

These hosts are not in the manifest: `network.hosts` names what the plugin itself reads, and nothing of a picture comes back to the plugin.

## What it does with foreign text

Titles and texts from the sources are somebody else's words. Before they are posted they lose everything in angle brackets (so nothing can mention a member), every address (the one link of a post is built by the plugin and checked against the host it must be on), and Markdown's signs are escaped. The formatting of a card's text (headings, bold, lists, quotes of a Steam announcement) is written by the plugin itself, around text that was escaped first. `excerpt`, `rich`, `line`, `plain`, `esc` and `link` in the file are the place to read. A game's name that Steam answered to a lookup is stored in the settings as one line of at most 100 characters and goes through the same cleaning every time it is posted.

## Limits it keeps

One request per event, a few seconds between two, at most five posts per kind and round, at most 50 games. A game that was just added starts at "now", GamerPower's list and the driver versions start silently, so switching the plugin on does not flood a channel.
