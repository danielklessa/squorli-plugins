/* squorli-plugin
{
  "id": "game-news",
  "name": { "en": "Game news", "de": "Spiele-News" },
  "description": {
    "en": "Posts news into channels of your choice: announcements and patch notes of the games you follow on Steam, games that are free to keep right now, and new graphics drivers.",
    "de": "Schreibt News in Kanäle deiner Wahl: Ankündigungen und Patchnotes der Spiele, denen ihr auf Steam folgt, Spiele, die es gerade kostenlos gibt, und neue Grafiktreiber."
  },
  "version": "1.1.0",
  "apiVersion": 2,
  "author": "Squorli",
  "homepage": "https://squorli.com/en/docs/plugins/",
  "capabilities": ["messages.write", "net.fetch"],
  "network": {
    "hosts": ["api.steampowered.com", "store.steampowered.com", "store-site-backend-static.ak.epicgames.com", "www.gamerpower.com", "gfwsl.geforce.com", "www.intel.com"]
  },
  "settings": [
    {
      "key": "updatesChannel",
      "type": "channel",
      "label": { "en": "Channel for game updates", "de": "Kanal für Spiele-Updates" },
      "help": { "en": "News of the games in the list below. Empty = no game updates.", "de": "News der Spiele aus der Liste darunter. Leer = keine Spiele-Updates." }
    },
    {
      "key": "games",
      "type": "list",
      "maxItems": 50,
      "label": { "en": "Games on Steam", "de": "Spiele auf Steam" },
      "help": {
        "en": "Per entry: a game's name, its Steam number or the address of its Steam store page. On saving, the plugin looks it up at Steam and writes it as \"Name (number)\". Only what appears from then on is posted. \"Patch notes only\" goes by Steam's mark or the title; many developers mark nothing.",
        "de": "Pro Eintrag: Name, Steam-Nummer oder Adresse der Steam-Seite eines Spiels. Beim Speichern schlägt das Plugin es nach und schreibt „Name (Nummer)“. Gepostet wird nur, was danach erscheint. „Nur Patchnotes“ richtet sich nach Steams Kennzeichnung oder dem Titel; viele Entwickler kennzeichnen nichts."
      },
      "fields": [
        { "key": "game", "type": "text", "required": true, "maxLength": 160, "label": { "en": "Game: name, Steam number or link", "de": "Spiel: Name, Steam-Nummer oder Link" } },
        {
          "key": "show",
          "type": "select",
          "default": "all",
          "label": { "en": "What to post", "de": "Was gepostet wird" },
          "options": [
            { "value": "all", "label": { "en": "All announcements", "de": "Alle Ankündigungen" } },
            { "value": "patch", "label": { "en": "Patch notes only", "de": "Nur Patchnotes" } }
          ]
        }
      ]
    },
    {
      "key": "freeChannel",
      "type": "channel",
      "label": { "en": "Channel for free games", "de": "Kanal für kostenlose Spiele" },
      "help": { "en": "Empty = no free games.", "de": "Leer = keine kostenlosen Spiele." }
    },
    {
      "key": "epic",
      "type": "boolean",
      "default": true,
      "label": { "en": "Free games: Epic Games Store", "de": "Kostenlose Spiele: Epic Games Store" }
    },
    {
      "key": "gamerpower",
      "type": "boolean",
      "default": true,
      "label": { "en": "Free games: Steam, GOG and others (via GamerPower)", "de": "Kostenlose Spiele: Steam, GOG und andere (über GamerPower)" }
    },
    {
      "key": "loot",
      "type": "boolean",
      "default": false,
      "label": { "en": "Free games: add-ons, in-game items and beta keys too", "de": "Kostenlose Spiele: auch Erweiterungen, Beigaben und Beta-Zugänge" }
    },
    {
      "key": "driversChannel",
      "type": "channel",
      "label": { "en": "Channel for graphics drivers", "de": "Kanal für Grafiktreiber" },
      "help": { "en": "Empty = no driver news. AMD is missing: its website gives programs no answer.", "de": "Leer = keine Treiber-News. AMD fehlt: Dessen Website gibt Programmen keine Antwort." }
    },
    {
      "key": "nvidia",
      "type": "boolean",
      "default": true,
      "label": { "en": "Graphics drivers: NVIDIA GeForce", "de": "Grafiktreiber: NVIDIA GeForce" }
    },
    {
      "key": "intel",
      "type": "boolean",
      "default": true,
      "label": { "en": "Graphics drivers: Intel Arc", "de": "Grafiktreiber: Intel Arc" }
    },
    {
      "key": "language",
      "type": "select",
      "default": "de",
      "label": { "en": "Language of the news", "de": "Sprache der News" },
      "options": [
        { "value": "de", "label": "Deutsch" },
        { "value": "en", "label": "English" }
      ]
    },
    {
      "key": "interval",
      "type": "select",
      "default": "30",
      "label": { "en": "Look for news every", "de": "Nach News suchen alle" },
      "options": [
        { "value": "15", "label": { "en": "15 minutes", "de": "15 Minuten" } },
        { "value": "30", "label": { "en": "30 minutes", "de": "30 Minuten" } },
        { "value": "60", "label": { "en": "hour", "de": "Stunde" } },
        { "value": "180", "label": { "en": "3 hours", "de": "3 Stunden" } }
      ]
    }
  ],
  "views": [
    {
      "id": "games",
      "title": { "en": "Followed games", "de": "Beobachtete Spiele" },
      "columns": [
        { "key": "name", "label": { "en": "Game", "de": "Spiel" } },
        { "key": "appId", "label": { "en": "Steam number", "de": "Steam-Nummer" } },
        { "key": "show", "label": { "en": "Posts", "de": "Postet" } },
        { "key": "since", "type": "time", "label": { "en": "Followed since", "de": "Beobachtet seit" } }
      ]
    }
  ]
}
*/
// SPDX-License-Identifier: Apache-2.0

// Game news: Squorli's own plugin that fetches from the internet (https://squorli.com/en/docs/plugins/). It does not ship
// with the server: an owner installs it from the catalogue of signed plugins in Verwaltung > Plugins, whose signed file comes
// from this repository's release. This file is where it is developed; its tests are game-news.test.ts next to it (README.md).
// It shows what a plugin with the capability `net.fetch` looks like: every address it asks is one of the hosts its manifest
// names, every answer is treated as text somebody else wrote, and a source that is down never stops the others. And it shows
// the two things interface version 2 brought for settings: a `list` field (the games, each with its own choice) and the
// event `settings.check`, in which the plugin looks a typed game up before the settings are saved.
//
// How it works. A job named "round" comes back every interval of the settings. It only plans: the next round first, then
// the first "step". A step asks ONE source (one game on Steam, Epic, GamerPower, NVIDIA, Intel), posts what is new and
// schedules the step after it, a few seconds later. One request per event keeps a step inside the ten seconds an event has,
// and the gap keeps a round inside the thirty requests a minute a plugin may make.
//
// Every post is a card (interface version 2, `messages.send` with `options.card`): the game or the source as a small line,
// the title as a link, the start of the text with its headings, lists and quotes, the first picture of an announcement
// below and the game's small picture in the corner. The plugin only names the pictures' addresses; the server fetches them
// and serves its own copies. The message's text says the same in plain words, for an app from before cards.
//
// What was posted already is remembered by the sources' own ids, so a restart or a job that comes twice posts nothing
// twice. A game that was just added starts at "now": nothing from before is posted.
//
// Sources (all read without a key or an account):
//   Steam        api.steampowered.com/ISteamNews/GetNewsForApp     the developers' announcements of one game
//                store.steampowered.com/api/storesearch, /appdetails   finding a game by name or number (when settings are saved),
//                                                                  and the address of a game's small picture
//   Epic         store-site-backend-static.ak.epicgames.com/freeGamesPromotions   not documented by Epic; may change
//   GamerPower   www.gamerpower.com/api/giveaways                  its terms ask for a link back, which every post carries
//   NVIDIA       gfwsl.geforce.com/.../AjaxDriverService.php       not documented by NVIDIA; may change
//   Intel        www.intel.com/.../download/785597/...             the Arc driver's download page, whose head names the version
// AMD is missing: amd.com gives a program no answer, and the pages that list its drivers elsewhere forbid reading them
// by program.

/** A game as the settings list it: its Steam number, its name, and whether only patch notes are posted. */
interface Listed { id: number; name: string; patch: boolean }
/** What the plugin remembers about a game: since when it is followed (seconds; nothing from before is posted) and the news it handled, the newest last. */
interface Tracked { id: number; since: number; seen: string[] }
interface Free { epic: string[]; gp: number[]; /** Which list of GamerPower `gp` belongs to; another one starts silently. */ gpMode: string }
interface Drivers { nvidia?: string; intel?: string }
interface Config { updates?: string; free?: string; drivers?: string; games: Listed[]; language: "de" | "en"; interval: number; epic: boolean; gamerpower: boolean; loot: boolean; nvidia: boolean; intel: boolean }
/** The small picture of each game (Steam's capsule), by Steam number: its address and when it was looked up (seconds). */
type Art = Record<string, { url: string; at: number }>;
type Step = { kind: "steam"; game: number } | { kind: "epic" } | { kind: "gamerpower" } | { kind: "nvidia" } | { kind: "intel" } | { kind: "art" };
/** A step's payload: its place in the round and how many posts the round made so far (updates, free games). */
interface Progress { i: number; u: number; f: number }
type Json = Record<string, unknown>;

const GAMES = "games", FREE = "free", DRIVERS = "drivers", ART = "art";
/** A game's picture is looked up again after this long: Steam's addresses for it change when a developer replaces it. */
const ART_MAX_AGE_S = 14 * 86_400;
const ROUND = "round", STEP = "step";
/** At most this many posts per round and kind; what is left over comes with the next round. */
const MAX_PER_ROUND = 5;
const SEEN_NEWS = 30, SEEN_EPIC = 100, SEEN_GP = 500;
const STEP_GAP_MS = 4000;
/** How an entry of the games list looks once it was looked up: "Name (Steam number)". */
const RESOLVED = /^(.+) \((\d{1,9})\)$/;
/** New entries looked up per save: each is a request to Steam, and the admin waits for all of them. */
const LOOKUPS_PER_SAVE = 5;

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** The games of the settings that were looked up already. An entry that was saved while the plugin did not run is skipped until the settings are saved again. */
function listed(values: Json): Listed[] {
  const out: Listed[] = [];
  for (const raw of list(values.games)) {
    const item = obj(raw);
    const m = RESOLVED.exec(str(item.game, 200).trim());
    if (!m || out.some((g) => g.id === Number(m[2]))) continue;
    out.push({ id: Number(m[2]), name: m[1]!, patch: item.show === "patch" });
  }
  return out;
}

async function config(): Promise<Config> {
  const s = await squorli.settings.get();
  const channel = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
  const on = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);
  const updates = channel(s.updatesChannel), free = channel(s.freeChannel), drivers = channel(s.driversChannel);
  const interval = Number(s.interval);
  return {
    ...(updates ? { updates } : {}), ...(free ? { free } : {}), ...(drivers ? { drivers } : {}),
    games: listed(s),
    language: s.language === "en" ? "en" : "de",
    interval: interval === 15 || interval === 60 || interval === 180 ? interval : 30,
    epic: on(s.epic, true), gamerpower: on(s.gamerpower, true), loot: on(s.loot, false), nvidia: on(s.nvidia, true), intel: on(s.intel, true),
  };
}

/**
 * What the plugin remembers per game, brought in line with the settings' list: a game that is new there starts now, one
 * that left the list is forgotten (added again later, it starts anew).
 */
async function tracked(c: Config): Promise<Tracked[]> {
  const stored = list(await squorli.storage.get(GAMES)).map(obj)
    .filter((g) => typeof g.id === "number")
    .map((g): Tracked => ({ id: g.id as number, since: typeof g.since === "number" ? g.since : 0, seen: list(g.seen).filter((x): x is string => typeof x === "string") }));
  const now = Math.floor(Date.now() / 1000);
  const next = c.games.map((g) => stored.find((t) => t.id === g.id) ?? { id: g.id, since: now, seen: [] });
  if (next.length !== stored.length || next.some((t, i) => stored[i]?.id !== t.id)) await squorli.storage.set(GAMES, next);
  return next;
}

/** What one round asks, in order. A kind without a channel is left out. */
function plan(c: Config): Step[] {
  const steps: Step[] = [];
  if (c.updates) for (const g of c.games) steps.push({ kind: "steam", game: g.id });
  if (c.free && c.epic) steps.push({ kind: "epic" });
  if (c.free && c.gamerpower) steps.push({ kind: "gamerpower" });
  if (c.drivers && c.nvidia) steps.push({ kind: "nvidia" });
  if (c.drivers && c.intel) steps.push({ kind: "intel" });
  // Last, so the sources' places in a round never move: one game's picture per round, when one is missing or old.
  if (c.updates && c.games.length) steps.push({ kind: "art" });
  return steps;
}

// ---------- Text from outside. Whatever a source sends is somebody else's text: it must not become a mention, a link of
// its own or formatting in the channel.

/** One line of foreign text as plain text of a message: no angle brackets (mentions, addresses), Markdown's signs escaped. */
function esc(text: string): string {
  return text.replace(/[<>]/g, "").replace(/[\\*_~=^[\]`|#]/g, "\\$&");
}
function entities(text: string): string {
  return text.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
/** One clean line: no line breaks, no address, cut with an ellipsis. */
function line(text: string, max: number): string {
  const t = entities(text).replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  return esc(t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);
}
/** The start of a Steam announcement (BBCode) as a few plain lines; list items become bullets. */
function excerpt(raw: string, maxChars: number, maxLines: number): string {
  const text = entities(raw.slice(0, 4000))
    .replace(/\{STEAM_CLAN_IMAGE\}[^\s[]*/g, " ")
    .replace(/\[img\][^[]{0,500}\[\/img\]/gi, " ")
    .replace(/\[\*\]/g, "\n• ")
    .replace(/\[\/(?:p|h[1-6]|list|olist|\*|tr|quote|code)\]|\[br\]|\[hr\]|\[(?:list|olist)\]/gi, "\n")
    .replace(/\[\/?[a-z][^\]\n]{0,300}\]/gi, "")
    .replace(/<[^>\n]{0,300}>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\\\[/g, "[");
  const out: string[] = [];
  let used = 0;
  for (const rawLine of text.split("\n")) {
    const l = rawLine.replace(/\s+/g, " ").trim();
    if (!l || l === "•") continue;
    if (out.length >= maxLines || used + l.length > maxChars) { out.push("…"); break; }
    out.push(esc(l));
    used += l.length;
  }
  return out.join("\n");
}
/** One line of foreign text for a card's title or kicker, which the app shows as plain text: nothing to escape, only one clean line without an address. */
function plain(text: string, max: number): string {
  const t = entities(text).replace(/[<>]/g, "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// Private-use characters stand for a card's formatting while the foreign text around them is escaped; a source's own are
// removed first, so no text from outside can bring formatting of its own.
const B_ON = "\uE000", B_OFF = "\uE001", HEAD = "\uE002", ITEM = "\uE003", Q_ON = "\uE004", Q_OFF = "\uE005";
const MARKS = /[\uE000-\uF8FF]/g;
/** One line with its bold parts: escaped like any foreign text, then each pair of marks becomes `**…**`; a mark without its partner is dropped. */
function bolded(l: string): string {
  return esc(l).replace(/\uE000([^\uE000\uE001]*)\uE001/g, (_m, inner: string) => (inner.trim() ? `**${inner.trim()}**` : "")).replace(MARKS, "").replace(/\s+/g, " ").trim();
}
/**
 * The start of a Steam announcement (BBCode) as the Markdown of a card: headings, bold, lists and quotes are kept as
 * formatting the plugin writes itself, everything else is plain text (no address, no picture, no mention).
 */
function rich(raw: string, maxChars: number, maxLines: number): string {
  const text = entities(raw.slice(0, 4000).replace(MARKS, ""))
    .replace(/\{STEAM_CLAN_IMAGE\}[^\s[\]"]*/g, " ")
    .replace(/\[img\][^[]{0,500}\[\/img\]/gi, " ")
    .replace(/\[b\]/gi, B_ON).replace(/\[\/b\]/gi, B_OFF)
    .replace(/\uE001(\s*)\uE000/g, "$1")
    .replace(/\[h[1-6]\]/gi, `\n${HEAD}`)
    .replace(/\[\*\]/g, `\n${ITEM}`)
    .replace(/\[quote[^\]\n]{0,300}\]/gi, `\n${Q_ON}\n`).replace(/\[\/quote\]/gi, `\n${Q_OFF}\n`)
    .replace(/\[\/(?:p|h[1-6]|list|olist|\*|tr|code)\]|\[br\]|\[hr\]|\[(?:list|olist)\]/gi, "\n")
    .replace(/\[\/?[a-z][^\]\n]{0,300}\]/gi, "")
    .replace(/<[^>\n]{0,300}>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\\\[/g, "[");
  const out: string[] = [];
  let used = 0, lines = 0, quoted = false, before = "";
  for (const rawLine of text.split("\n")) {
    const l = rawLine.trim();
    if (l === Q_ON || l === Q_OFF) { quoted = l === Q_ON; continue; }
    const kind = l.startsWith(HEAD) ? "head" : l.startsWith(ITEM) ? "item" : "text";
    const body = kind === "head" ? esc(l.replace(MARKS, "").replace(/\s+/g, " ").trim()) : bolded(l);
    if (!body || body === "•") continue;
    if (lines >= maxLines || used + body.length > maxChars) { out.push("", "…"); break; }
    // A blank line wherever the kind of block changes, so each is read as what it is.
    const block = `${quoted ? "quote" : ""}${kind}`;
    if (before && before !== block) out.push("");
    before = block;
    out.push(`${quoted ? "> " : ""}${kind === "head" ? "### " : kind === "item" ? "- " : ""}${body}`);
    used += body.length;
    lines++;
  }
  return out.join("\n");
}
/** An address of a picture a source handed over, taken only when it is a plain https address that fits the pattern of its host. */
function picture(v: unknown, host: RegExp): string | undefined {
  const url = str(v, 400);
  return host.test(url) && !/[\s<>"'`\\]/.test(url) ? url : undefined;
}
const STEAM_PICTURE = /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.steamstatic\.com\//;
/** The first picture of a Steam announcement, else the still of its first video (the 16:9 one, without bars): addresses built here from ids, on fixed hosts. */
function steamPicture(contents: string): string | undefined {
  const img = /\{STEAM_CLAN_IMAGE\}\/(\d{1,12}\/[0-9a-f]{20,64}\.(?:png|jpe?g|gif|webp))/i.exec(contents);
  if (img) return `https://clan.akamai.steamstatic.com/images/${img[1]}`;
  const video = /\[previewyoutube="?([\w-]{11})[;"\]]/i.exec(contents);
  return video ? `https://i.ytimg.com/vi/${video[1]}/mqdefault.jpg` : undefined;
}
async function loadArt(): Promise<Art> {
  const out: Art = {};
  for (const [id, raw] of Object.entries(obj(await squorli.storage.get(ART)))) {
    const url = picture(obj(raw).url, STEAM_PICTURE), at = obj(raw).at;
    if (/^\d{1,9}$/.test(id) && url && typeof at === "number") out[id] = { url, at };
  }
  return out;
}

/** An address a source handed over, taken only when it is a plain https address of the expected host. */
function link(v: unknown, host: string): string | null {
  const url = str(v, 400);
  return url.startsWith(`https://${host}/`) && !/[\s<>"'`\\]/.test(url) ? url : null;
}
/** The content of one `<meta name="…" content="…">` of a page, found without reading the page as markup. */
function meta(html: string, name: string): string {
  const at = html.indexOf(`<meta name="${name}" content="`);
  if (at < 0) return "";
  const from = at + `<meta name="${name}" content="`.length;
  const to = html.indexOf('"', from);
  return to < 0 || to - from > 300 ? "" : entities(html.slice(from, to));
}

// ---------- Time. The sandbox knows UTC only; German posts name Central European time, English ones UTC.

function lastSunday(year: number, month: number): number {
  const end = new Date(Date.UTC(year, month + 1, 0));
  return end.getUTCDate() - end.getUTCDay();
}
function centralEuropeanOffset(utcMs: number): number {
  const year = new Date(utcMs).getUTCFullYear();
  const summer = utcMs >= Date.UTC(year, 2, lastSunday(year, 2), 1) && utcMs < Date.UTC(year, 9, lastSunday(year, 9), 1);
  return summer ? 120 : 60;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const two = (n: number): string => (n < 10 ? `0${n}` : String(n));
function dayText(language: string, utcMs: number, withTime: boolean): string {
  if (language === "en") {
    const d = new Date(utcMs);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${withTime ? `, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC` : ""}`;
  }
  const d = new Date(utcMs + centralEuropeanOffset(utcMs) * 60_000);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${withTime ? `, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} Uhr` : ""}`;
}
/** A calendar day (year, month 1 to 12, day) as a post names it. */
function dateText(language: string, year: number, month: number, day: number): string {
  return language === "en" ? `${MONTHS[month - 1]} ${day}, ${year}` : `${day}.${month}.${year}`;
}

// ---------- The sources

async function getJson(url: string): Promise<unknown> {
  return JSON.parse((await squorli.net.get(url)).text) as unknown;
}

/**
 * Is this announcement about a new version? Steam has a tag for it, but developers set it rarely (seen on the first day of
 * this plugin: a post titled "Season 03 Patch Notes" carried none), so the title counts too.
 */
function isPatchNote(tags: unknown[], title: string): boolean {
  return tags.includes("patchnotes") || /\b(?:patch(?:es|ed)?|patch ?notes|hot ?fix(?:es)?|bug ?fix(?:es)?|update[sd]?|changelog|change ?log|release notes)\b/i.test(title);
}

/** One game's announcements on Steam. Returns how many were posted. */
async function checkSteam(c: Config, games: Tracked[], appId: number, room: number): Promise<number> {
  const game = c.games.find((g) => g.id === appId), state = games.find((g) => g.id === appId);
  if (!game || !state || !c.updates) return 0;
  const data = obj(obj(await getJson(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=5&feeds=steam_community_announcements`)).appnews);
  const items = list(data.newsitems).map(obj)
    .map((n) => ({ gid: str(n.gid, 40), title: str(n.title, 300), url: n.url, contents: str(n.contents, 4000), date: typeof n.date === "number" ? n.date : 0, patch: isPatchNote(list(n.tags), str(n.title, 300)) }))
    .filter((n) => n.gid && n.date >= state.since && !state.seen.includes(n.gid))
    .sort((a, b) => a.date - b.date);
  const art = items.length ? await loadArt() : {};
  let posted = 0;
  for (const n of items) {
    if (!game.patch || n.patch) {
      if (posted >= room) break; // the rest stays unseen and comes with the next round
      const kind = n.patch ? "Update" : c.language === "en" ? "News" : "Neuigkeit";
      const address = link(n.url, "steamstore-a.akamaihd.net") ?? link(n.url, "store.steampowered.com") ?? link(n.url, "steamcommunity.com") ?? `https://store.steampowered.com/news/app/${appId}`;
      const body = excerpt(n.contents, 350, 6);
      const text = rich(n.contents, 700, 12), image = steamPicture(n.contents), thumbnail = art[String(appId)]?.url;
      await squorli.messages.send(c.updates, `🎮 **${line(game.name, 80)}** · ${kind}: **${line(n.title, 150)}**${body ? `\n${body}` : ""}\n${address}`, {
        card: { kicker: `${plain(game.name, 60)} · ${kind}`, title: plain(n.title, 180) || kind, url: address, ...(text ? { text } : {}), ...(image ? { image } : {}), ...(thumbnail ? { thumbnail } : {}) },
      });
      posted++;
    }
    state.seen.push(n.gid);
  }
  if (items.length) {
    state.seen = state.seen.slice(-SEEN_NEWS);
    await squorli.storage.set(GAMES, games);
  }
  return posted;
}

async function loadFree(): Promise<Free> {
  const v = obj(await squorli.storage.get(FREE));
  return { epic: list(v.epic).filter((x): x is string => typeof x === "string"), gp: list(v.gp).filter((x): x is number => typeof x === "number"), gpMode: str(v.gpMode, 20) };
}

/** What Epic gives away right now. Epic's list also holds games that are merely discounted or free next week: only a price of zero inside a running offer counts. */
async function checkEpic(c: Config, room: number): Promise<number> {
  if (!c.free) return 0;
  const german = c.language === "de";
  const data = await getJson(`https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=${german ? "de" : "en-US"}&country=${german ? "DE" : "US"}&allowCountries=${german ? "DE" : "US"}`);
  const elements = list(obj(obj(obj(obj(data).data).Catalog).searchStore).elements).map(obj);
  const free = await loadFree();
  const now = Date.now();
  let posted = 0, changed = false;
  for (const e of elements) {
    if (obj(obj(e.price).totalPrice).discountPrice !== 0) continue;
    if (e.offerType === "ADD_ON" && !c.loot) continue;
    let ends = 0, starts = 0;
    for (const group of list(obj(e.promotions).promotionalOffers)) for (const raw of list(obj(group).promotionalOffers)) {
      const offer = obj(raw);
      const from = Date.parse(str(offer.startDate, 40)), until = Date.parse(str(offer.endDate, 40));
      if (obj(offer.discountSetting).discountPercentage === 0 && from <= now && now < until) { starts = from; ends = until; }
    }
    if (!ends) continue;
    const key = `${str(e.id, 64)}:${starts}`;
    if (free.epic.includes(key)) continue;
    if (posted >= room) break;
    const mappings = [...list(obj(e.catalogNs).mappings), ...list(e.offerMappings)].map(obj);
    const slug = str(mappings.find((m) => m.pageType === "productHome")?.pageSlug ?? mappings[0]?.pageSlug ?? str(e.productSlug, 120).replace(/\/home$/, ""), 120);
    const store = `https://store.epicgames.com/${german ? "de" : "en-US"}`;
    const address = /^[a-z0-9][a-z0-9-]{1,118}$/i.test(slug) ? `${store}/p/${slug}` : `${store}/free-games`;
    const until = dayText(c.language, ends, true);
    const images = list(e.keyImages).map(obj);
    const image = picture((images.find((k) => k.type === "OfferImageWide") ?? images.find((k) => k.type === "DieselStoreFrontWide") ?? images[0])?.url, /^https:\/\/[a-z0-9-]+\.(?:epicgames\.com|unrealengine\.com)\//);
    const about = line(str(e.description, 600), 300);
    await squorli.messages.send(c.free, german
      ? `🎁 **Kostenlos im Epic Games Store: ${line(str(e.title, 200), 120)}** · bis ${until}\n${address}`
      : `🎁 **Free on the Epic Games Store: ${line(str(e.title, 200), 120)}** · until ${until}\n${address}`, {
      card: {
        kicker: german ? "Epic Games Store · Kostenlos" : "Epic Games Store · Free", title: plain(str(e.title, 200), 180) || "Epic Games Store", url: address,
        text: `${german ? `**Kostenlos** bis ${until}` : `**Free** until ${until}`}${about ? `\n${about}` : ""}`, ...(image ? { image } : {}),
      },
    });
    posted++;
    free.epic.push(key);
    changed = true;
  }
  if (changed) { free.epic = free.epic.slice(-SEEN_EPIC); await squorli.storage.set(FREE, free); }
  return posted;
}

/** Giveaways GamerPower lists for PC (Steam, GOG and others). A list it is asked for the first time starts silently. */
async function checkGamerPower(c: Config, room: number): Promise<number> {
  if (!c.free) return 0;
  const mode = c.loot ? "all" : "game";
  const data = await getJson(`https://www.gamerpower.com/api/giveaways?platform=pc${c.loot ? "" : "&type=game"}`);
  const items = list(data).map(obj).filter((g) => typeof g.id === "number" && (g.status === undefined || g.status === "Active"));
  const free = await loadFree();
  if (free.gpMode !== mode) {
    free.gp = [...free.gp, ...items.map((g) => g.id as number)].slice(-SEEN_GP);
    free.gpMode = mode;
    await squorli.storage.set(FREE, free);
    return 0;
  }
  const german = c.language === "de";
  let posted = 0, changed = false;
  // The newest come first in the list; post the oldest of the new ones first.
  for (const g of items.filter((x) => !free.gp.includes(x.id as number)).reverse()) {
    const platforms = str(g.platforms, 120);
    // Epic's own list tells of its giveaways already.
    const double = c.epic && /epic games/i.test(platforms);
    if (!double) {
      if (posted >= room) break;
      const address = link(g.gamerpower_url, "www.gamerpower.com") ?? "https://www.gamerpower.com/";
      const end = Date.parse(`${str(g.end_date, 30).replace(" ", "T")}Z`);
      const worth = /^\$\d{1,5}(?:\.\d{2})?$/.test(str(g.worth, 12)) && g.worth !== "$0.00" ? str(g.worth, 12) : "";
      const facts = [line(platforms, 80), worth ? (german ? `statt ${worth}` : `instead of ${worth}`) : "", Number.isFinite(end) ? `${german ? "bis" : "until"} ${dayText(c.language, end, false)}` : ""].filter(Boolean).join(" · ");
      const about = line(str(g.description, 600), 220);
      const image = picture(g.image, /^https:\/\/www\.gamerpower\.com\//);
      await squorli.messages.send(c.free, `🎁 **${german ? "Kostenlos" : "Free"}: ${line(str(g.title, 200), 120)}**${facts ? `\n${facts}` : ""}${about ? `\n${about}` : ""}\n${address}\n${german ? "Quelle" : "Source"}: GamerPower`, {
        card: {
          kicker: german ? "Kostenlos" : "Free", title: plain(str(g.title, 200), 180) || "GamerPower", url: address,
          // The link back GamerPower's terms ask for stands in the card too.
          text: `${facts ? `**${facts}**\n` : ""}${about ? `${about}\n` : ""}${german ? "Quelle" : "Source"}: [GamerPower](https://www.gamerpower.com/)`, ...(image ? { image } : {}),
        },
      });
      posted++;
    }
    free.gp.push(g.id as number);
    changed = true;
  }
  if (changed) { free.gp = free.gp.slice(-SEEN_GP); await squorli.storage.set(FREE, free); }
  return posted;
}

/** Remember a driver's version; true when it is another one than the one remembered (never for the first one seen). */
async function newVersion(vendor: "nvidia" | "intel", version: string): Promise<boolean> {
  const drivers = obj(await squorli.storage.get(DRIVERS)) as Drivers;
  const before = drivers[vendor];
  if (before === version) return false;
  await squorli.storage.set(DRIVERS, { ...drivers, [vendor]: version });
  return before !== undefined && before !== "";
}

/** NVIDIA's newest GeForce Game Ready driver for Windows. The first version seen is only remembered. */
async function checkNvidia(c: Config): Promise<void> {
  if (!c.drivers) return;
  const data = await getJson("https://gfwsl.geforce.com/services_toolkit/services/com/nvidia/services/AjaxDriverService.php?func=DriverManualLookup&psid=127&pfid=995&osID=57&languageCode=1033&beta=0&isWHQL=1&dltype=-1&dch=1&upCRD=0&numberOfResults=1");
  const info = obj(obj(list(obj(data).IDS)[0]).downloadInfo);
  const version = str(info.Version, 20);
  if (!/^\d{1,4}\.\d{1,4}$/.test(version)) throw new Error("NVIDIA's answer names no driver version");
  if (!(await newVersion("nvidia", version))) return;
  let name = "GeForce Game Ready Driver";
  try { name = decodeURIComponent(str(info.Name, 200)) || name; } catch { /* keep the default */ }
  const released = /^[A-Z][a-z]{2} ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(str(info.ReleaseDateTime, 40));
  const month = released ? MONTHS.indexOf(released[1]!) : -1;
  const date = released && month >= 0 ? dateText(c.language, Number(released[3]), month + 1, Number(released[2])) : "";
  const address = link(info.DetailsURL, "www.nvidia.com") ?? "https://www.nvidia.com/drivers/";
  await squorli.messages.send(c.drivers, `🖥️ **NVIDIA ${line(name, 80)} ${version}**${date ? ` · ${date}` : ""}\n${address}`, {
    card: { kicker: c.language === "en" ? "NVIDIA · Graphics driver" : "NVIDIA · Grafiktreiber", title: `${plain(name, 80)} ${version}`, url: address, ...(date ? { text: c.language === "en" ? `Released ${date}` : `Veröffentlicht am ${date}` } : {}) },
  });
}

const INTEL_PAGE = "https://www.intel.com/content/www/us/en/download/785597/intel-arc-graphics-windows.html";
/** Intel's newest Arc graphics driver for Windows, read from the head of its download page. The first version seen is only remembered. */
async function checkIntel(c: Config): Promise<void> {
  if (!c.drivers) return;
  const html = (await squorli.net.get(INTEL_PAGE)).text;
  const version = /^\d{1,3}\.\d{1,3}\.\d{1,4}\.\d{1,6}/.exec(meta(html, "DownloadVersion"))?.[0];
  if (!version) throw new Error("Intel's page names no driver version");
  if (!(await newVersion("intel", version))) return;
  // "11/04/2026 00:00:00": month, day, year.
  const changed = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(meta(html, "lastModifieddate"));
  const date = changed ? dateText(c.language, Number(changed[3]), Number(changed[1]), Number(changed[2])) : "";
  await squorli.messages.send(c.drivers, `🖥️ **Intel Arc Graphics ${c.language === "en" ? "Driver" : "Treiber"} ${version}**${date ? ` · ${date}` : ""}\n${INTEL_PAGE}`, {
    card: { kicker: c.language === "en" ? "Intel · Graphics driver" : "Intel · Grafiktreiber", title: `Intel Arc Graphics ${c.language === "en" ? "Driver" : "Treiber"} ${version}`, url: INTEL_PAGE, ...(date ? { text: c.language === "en" ? `Released ${date}` : `Veröffentlicht am ${date}` } : {}) },
  });
}

/**
 * One game's small picture per round: the listed game that has none yet, else the one whose picture was looked up longest
 * ago, if that is long enough. Games that left the list are forgotten here.
 */
async function checkArt(c: Config): Promise<void> {
  const art = await loadArt();
  const now = Math.floor(Date.now() / 1000);
  const kept: Art = {};
  for (const g of c.games) { const a = art[String(g.id)]; if (a) kept[String(g.id)] = a; }
  const next = [...c.games].sort((a, b) => (kept[String(a.id)]?.at ?? 0) - (kept[String(b.id)]?.at ?? 0))[0];
  const pruned = Object.keys(kept).length !== Object.keys(art).length;
  if (!next || now - (kept[String(next.id)]?.at ?? 0) < ART_MAX_AGE_S) { if (pruned) await squorli.storage.set(ART, kept); return; }
  const data = obj(obj(obj(await getJson(`https://store.steampowered.com/api/appdetails?appids=${next.id}&filters=basic`))[String(next.id)]).data);
  const url = picture(data.capsule_image, STEAM_PICTURE) ?? picture(data.header_image, STEAM_PICTURE);
  // A game without a picture is asked again after the same time, not every round.
  if (url) kept[String(next.id)] = { url, at: now }; else if (kept[String(next.id)]) kept[String(next.id)]!.at = now;
  if (url || pruned || kept[String(next.id)]) await squorli.storage.set(ART, kept);
}

// ---------- The schedule

async function startSoon(): Promise<void> {
  await tracked(await config());
  await squorli.schedule.cancel(STEP);
  await squorli.schedule.at(Date.now() + 5000, ROUND, null, { key: ROUND });
}
// A fresh installation has no job yet, and the interval, a channel or the games may have changed.
squorli.on("enable", startSoon);
squorli.on("settings.change", startSoon);

squorli.on("job", async (job: Squorli.JobEvent): Promise<void> => {
  const c = await config();
  if (job.name === ROUND) {
    // The next round first: whatever fails from here on, the plugin comes back.
    await squorli.schedule.at(Date.now() + c.interval * 60_000, ROUND, null, { key: ROUND });
    await squorli.schedule.at(Date.now(), STEP, { i: 0, u: 0, f: 0 }, { key: STEP });
    return;
  }
  if (job.name !== STEP) return;
  const p = obj(job.payload);
  const at: Progress = { i: typeof p.i === "number" ? p.i : 0, u: typeof p.u === "number" ? p.u : 0, f: typeof p.f === "number" ? p.f : 0 };
  const steps = plan(c);
  const step = steps[at.i];
  if (!step) return;
  try {
    if (step.kind === "steam") at.u += await checkSteam(c, await tracked(c), step.game, MAX_PER_ROUND - at.u);
    else if (step.kind === "epic") at.f += await checkEpic(c, MAX_PER_ROUND - at.f);
    else if (step.kind === "gamerpower") at.f += await checkGamerPower(c, MAX_PER_ROUND - at.f);
    else if (step.kind === "nvidia") await checkNvidia(c);
    else if (step.kind === "intel") await checkIntel(c);
    else await checkArt(c);
  } catch (err) {
    // A source that is down, changed its answer or sent something unreadable: say so in the log and go on with the next.
    squorli.log.warn(`${step.kind}${step.kind === "steam" ? ` ${step.game}` : ""}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (at.i + 1 < steps.length) await squorli.schedule.at(Date.now() + STEP_GAP_MS, STEP, { i: at.i + 1, u: at.u, f: at.f }, { key: STEP });
});

// ---------- The games list of the settings

const short = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
type Lookup = { id: number; name: string; picture?: string | undefined } | { en: string; de: string };

/** Find a game at Steam: by its number, by the address of its store page, or by its name (several hits are named with their numbers). */
async function lookUp(typed: string): Promise<Lookup> {
  const shown = short(typed, 50);
  const byNumber = /^\d{1,9}$/.exec(typed)?.[0] ?? /store\.steampowered\.com\/app\/(\d{1,9})(?:[/?#]|$)/.exec(typed)?.[1];
  try {
    if (byNumber) {
      const app = obj(obj(await getJson(`https://store.steampowered.com/api/appdetails?appids=${byNumber}&filters=basic`))[byNumber]);
      const name = str(obj(app.data).name, 100).replace(/\s+/g, " ").trim();
      if (app.success === true && name) return { id: Number(byNumber), name, picture: picture(obj(app.data).capsule_image, STEAM_PICTURE) };
      return { en: `Steam knows no game with the number ${byNumber}.`, de: `Steam kennt kein Spiel mit der Nummer ${byNumber}.` };
    }
    const hits = list(obj(await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(typed.slice(0, 100))}&l=english&cc=US`)).items).map(obj)
      .filter((h) => h.type === "app" && typeof h.id === "number" && typeof h.name === "string").map((h) => ({ id: h.id as number, name: str(h.name, 100).replace(/\s+/g, " ").trim(), picture: picture(h.tiny_image, STEAM_PICTURE) }));
    const exact = hits.filter((h) => h.name.toLowerCase() === typed.toLowerCase());
    if (hits.length === 0) return { en: `Steam finds nothing for "${shown}".`, de: `Steam findet nichts zu „${shown}“.` };
    if (exact.length === 1 || hits.length === 1) return exact[0] ?? hits[0]!;
    const choices = hits.slice(0, 4).map((h) => `${short(h.name, 40)} (${h.id})`).join(", ");
    return { en: `Several games fit "${shown}": ${choices}. Enter the number.`, de: `Zu „${shown}“ passen mehrere Spiele: ${choices}. Trage die Nummer ein.` };
  } catch {
    return { en: `Steam does not answer right now ("${shown}"). Save again in a moment.`, de: `Steam antwortet gerade nicht („${shown}“). Speichere gleich noch einmal.` };
  }
}

// Before the settings are saved: every entry of the games list that is not "Name (number)" yet is looked up at Steam and
// written that way. An entry Steam does not know, or a name several games fit, refuses the save with a sentence at the
// field, so nothing half-looked-up is ever stored.
squorli.on("settings.check", async (e: Squorli.SettingsCheckEvent): Promise<Squorli.SettingsCheckResult | void> => {
  const out: { game: string; show: string }[] = [];
  const ids: number[] = [];
  const en: string[] = [], de: string[] = [];
  const pictures: Art = {};
  let lookups = 0;
  for (const raw of list(e.values.games)) {
    const item = obj(raw);
    const typed = str(item.game, 200).replace(/\s+/g, " ").trim();
    if (!typed) continue;
    const show = item.show === "patch" ? "patch" : "all";
    const done = RESOLVED.exec(typed);
    let game: { id: number; name: string };
    if (done) game = { id: Number(done[2]), name: done[1]! };
    else {
      if (lookups >= LOOKUPS_PER_SAVE) {
        en.push(`Add at most ${LOOKUPS_PER_SAVE} new games per save.`); de.push(`Füge pro Speichern höchstens ${LOOKUPS_PER_SAVE} neue Spiele hinzu.`);
        break;
      }
      lookups++;
      const found = await lookUp(typed);
      if ("en" in found) { en.push(found.en); de.push(found.de); continue; }
      game = found;
      // Steam's answer to the lookup names the game's small picture already: remembered for its cards.
      if (found.picture) pictures[String(found.id)] = { url: found.picture, at: Math.floor(Date.now() / 1000) };
    }
    if (ids.includes(game.id)) continue; // the same game twice: once is enough
    ids.push(game.id);
    out.push({ game: `${short(game.name, 100)} (${game.id})`, show });
  }
  if (en.length) return { fieldErrors: { games: { en: short(en.join(" "), 480), de: short(de.join(" "), 480) } } };
  if (Object.keys(pictures).length) await squorli.storage.set(ART, { ...(await loadArt()), ...pictures });
  return { values: { games: out } };
});

// Verwaltung > Plugins > Spiele-News > "Beobachtete Spiele".
squorli.on("view", async (): Promise<Squorli.ViewResult> => {
  const c = await config();
  const state = await tracked(c);
  const german = c.language === "de";
  return [...c.games].sort((a, b) => a.name.localeCompare(b.name)).map((g) => ({
    name: g.name, appId: String(g.id),
    show: g.patch ? (german ? "nur Patchnotes" : "patch notes only") : (german ? "alle Ankündigungen" : "all announcements"),
    since: (state.find((t) => t.id === g.id)?.since ?? 0) * 1000,
  }));
});
