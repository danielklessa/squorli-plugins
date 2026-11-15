# Game news

Squorli's own plugin (signed as `official`). It posts news into channels an admin picks: patch notes of the games a server follows on Steam, games that are free to keep right now, and new graphics drivers.

It is developed and tested in the server repository ([`apps/server/plugins/game-news.ts`](https://github.com/danielklessa/squorli/blob/main/apps/server/plugins/game-news.ts), with its tests next to the server's) and ships with the server under "Verfügbar". The file here is a copy of that one, brought here to be signed; the signed file goes back into the server and is also the download of this repository's release.

## What it asks for

| Capability | Why |
|---|---|
| `messages.write` | It writes the news into the channels picked in its settings, and answers `/news-add`, `/news-remove` and `/news-list`. |
| `net.fetch` | It reads the sources below. |

It reads no messages and no member list.

## Hosts

Every request is one GET without a key, an account or a cookie. Nothing about the server or its members is sent: the addresses carry a Steam game number, a search word an admin typed into `/news-add`, or the language of the plugin's settings (German or English, which Epic's list is asked in), and nothing else that varies.

| Host | What is asked there | Why |
|---|---|---|
| `api.steampowered.com` | `ISteamNews/GetNewsForApp` with the number of one followed game | The developers' announcements of that game; patch notes are the entries tagged `patchnotes`. Steam's Web API, no key needed for this method. |
| `store.steampowered.com` | `api/storesearch` with the word typed into `/news-add`, `api/appdetails` with a game number | Finding a game by its name, and the name of a game given by its number. |
| `store-site-backend-static.ak.epicgames.com` | `freeGamesPromotions` | What the Epic Games Store gives away this week. Not documented by Epic; it may change without notice, and the plugin then says so in its log and goes on with the other sources. |
| `www.gamerpower.com` | `api/giveaways` for the platform PC | Giveaways on Steam, GOG and other stores. A documented, free interface; its terms ask for a link back, which every post from this source carries. |
| `gfwsl.geforce.com` | `AjaxDriverService.php`, the driver lookup of NVIDIA's own download page | The newest GeForce Game Ready driver for Windows. Not documented by NVIDIA; it may change without notice. |

Addresses the plugin only writes into a post (a game's page at `store.epicgames.com`, a driver's page at `www.nvidia.com`) are no hosts it fetches from and are not in its manifest. Since the plugin holds `net.fetch`, the server makes link previews for its posts, as it does for a member's message.

## What it does with foreign text

Titles and texts from the sources are somebody else's words. Before they are posted they lose everything in angle brackets (so nothing can mention a member), every address (the one link of a post is built by the plugin and checked against the host it must be on), and Markdown's signs are escaped. `excerpt`, `line`, `esc` and `link` in the file are the place to read.

## Limits it keeps

One request per event, a few seconds between two, at most five posts per kind and round. A game that was just added starts at "now", GamerPower's list and the driver version start silently, so switching the plugin on does not flood a channel.
