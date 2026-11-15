import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PluginRunner, checkValues, netAllowed, readPluginFile, settingsCheckAnswer, worker, type InvocationContext } from "../../tools/testing/server";

/**
 * The game news plugin (game-news.ts next to this file), run in the server's real sandbox (tools/testing/server.ts) against a
 * host this test plays: storage, settings, the schedule, the channels and the internet are plain values here. What is
 * checked is the plugin's own logic: what counts as new, that nothing is posted twice or from before a game was added, that
 * foreign text cannot mention or format, the limits of a round, that a source that fails stops nothing, the games list
 * of its settings (looked up at Steam before it is saved), and the card every post carries.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "game-news.ts"), "utf8");
const U = "5f0e4d7c-93a1-4b53-9d6a-2f1c8c7f1a01", F = "5f0e4d7c-93a1-4b53-9d6a-2f1c8c7f1a02", D = "5f0e4d7c-93a1-4b53-9d6a-2f1c8c7f1a03";
const SOMEBODY = "5f0e4d7c-93a1-4b53-9d6a-2f1c8c7f1a11";

let store = new Map<string, unknown>();
let settings: Record<string, unknown> = {};
let sent: { channelId: string; content: string; card?: Record<string, string> }[] = [];
let scheduled: { when: number; name: string; key?: string; payload?: unknown }[] = [];
let cancelled: string[] = [];
let asked: string[] = [];
let logged: string[] = [];
/** What the played internet answers: the first entry whose key the address starts with. */
let web: [string, unknown][] = [];
const failures: string[] = [];
let hosts: string[] = [];
let manifest: Extract<ReturnType<typeof readPluginFile>, { ok: true }>["manifest"];

const runner = new PluginRunner({
  ...worker, cpuMs: 200, memoryMb: 32,
  answerMax: (fn) => (fn === "net.get" ? 1024 * 1024 : 64 * 1024),
  onFailure: (_id, kind, message) => failures.push(`${kind}: ${message}`),
  onCall: async (_id, _ctx, fn, raw) => {
    const args = raw as Record<string, unknown>;
    switch (fn) {
      case "storage.get": return store.has(args.key as string) ? JSON.parse(JSON.stringify(store.get(args.key as string))) : null;
      case "storage.set": store.set(args.key as string, args.value); return true;
      case "settings.get": return settings;
      case "schedule.at": scheduled.push(args as never); return { id: "job", dueAt: new Date(args.when as number).toISOString() };
      case "schedule.cancel": cancelled.push(args.key as string); return true;
      case "messages.send": sent.push(args as never); return { id: "message", seq: 1 };
      case "log": logged.push(`${String(args.level)}: ${String(args.text)}`); return true;
      case "net.get": {
        const url = String(args.url);
        asked.push(url);
        // The real host function's rule: an address outside the manifest's hosts never leaves the server.
        if (!netAllowed(new URL(url), hosts)) throw new Error(`net.get: ${new URL(url).host} is not among the hosts of the plugin's manifest`);
        const hit = web.find(([prefix]) => url.startsWith(prefix));
        if (!hit) throw new Error("net.get: no usable answer");
        return { url, contentType: "application/json", text: typeof hit[1] === "string" ? hit[1] : JSON.stringify(hit[1]) };
      }
      default: return undefined;
    }
  },
});
const ctx = (event: string): InvocationContext => ({ event, depth: 0 });
const job = (name: string, payload: unknown = null) => runner.invoke("game-news", "job", { name, key: name, payload, dueAt: new Date().toISOString(), late: false, attempt: 1 }, ctx("job"));
const step = (i: number, u = 0, f = 0) => job("step", { i, u, f });
type Tracked = { id: number; since: number; seen: string[] };
const games = () => (store.get("games") ?? []) as Tracked[];
const nowSeconds = () => Math.floor(Date.now() / 1000);
type Entry = { game: string; show: string };
/** Save the games list as an admin would: what the plugin answers to `settings.check`, read as the server reads it. */
async function save(entries: Partial<Entry>[]) {
  const checked = checkValues(manifest.settings, { ...settings, games: entries });
  if (!checked.ok) return { ok: false as const, fieldErrors: checked.errors as Record<string, unknown> };
  const answer = (await runner.invoke("game-news", "settings.check", { values: checked.values, by: SOMEBODY }, ctx("settings.check"))).value;
  const said = settingsCheckAnswer(manifest.settings, checked.values, answer);
  if (!said.ok) return said;
  settings = { ...checked.values, ...said.values };
  return { ok: true as const, games: settings.games as Entry[] };
}

const STEAM = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=";
const DETAILS = "https://store.steampowered.com/api/appdetails?appids=";
const SEARCH = "https://store.steampowered.com/api/storesearch/?term=";
const EPIC = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions";
const GP = "https://www.gamerpower.com/api/giveaways";
const NVIDIA = "https://gfwsl.geforce.com/services_toolkit/services/com/nvidia/services/AjaxDriverService.php";
const INTEL = "https://www.intel.com/content/www/us/en/download/785597/intel-arc-graphics-windows.html";
const news = (gid: string, date: number, title: string, contents: string, tags: string[] = ["patchnotes"]) => ({ gid, title, url: `https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/${gid}`, contents, date, tags, feedname: "steam_community_announcements" });
const steamAnswer = (appid: number, items: unknown[]) => ({ appnews: { appid, newsitems: items, count: items.length } });
const epicGame = (over: Record<string, unknown>) => ({
  title: "Knightica", id: "9975548b", offerType: "BASE_GAME", productSlug: null, urlSlug: "72b46f5d95624fd5b7e7d81b7dcaead1",
  catalogNs: { mappings: [{ pageSlug: "knightica-3be45c", pageType: "productHome" }] },
  price: { totalPrice: { discountPrice: 0, originalPrice: 1349 } },
  promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: "2020-01-01T16:00:00.000Z", endDate: "2099-07-01T15:00:00.000Z", discountSetting: { discountType: "PERCENTAGE", discountPercentage: 0 } }] }], upcomingPromotionalOffers: [] },
  ...over,
});
const epicAnswer = (elements: unknown[]) => ({ data: { Catalog: { searchStore: { elements } } } });
const giveaway = (id: number, over: Record<string, unknown> = {}) => ({
  id, title: `Game ${id} (Steam) Giveaway`, worth: "$19.99", description: "Claim it and keep it forever.", platforms: "PC, Steam", end_date: "2099-01-15 23:59:00", type: "Game", status: "Active",
  gamerpower_url: `https://www.gamerpower.com/game-${id}-giveaway`, open_giveaway_url: `https://www.gamerpower.com/open/game-${id}-giveaway`, ...over,
});
const nvidiaAnswer = (version: string) => `{ "Success" : "1", "IDS" : [{ "downloadInfo": { "Success" : "1", "ID" : "285320", "Name" : "GeForce%20Game%20Ready%20Driver", "Version" : "${version}", "ReleaseDateTime" : "Thu Nov 12, 2026", "DetailsURL" : "https://www.nvidia.com/en-us/drivers/details/285320/" } }] }`;
const intelPage = (version: string) => `<!doctype html><html><head><meta name="title" content="Intel® Arc™ Graphics - Windows*"/>\n<meta name="DownloadVersion" content="${version} WHQL Certified"/>\n<meta name="lastModifieddate" content="11/04/2026 00:00:00"/></head><body>${"<p>x</p>".repeat(2000)}</body></html>`;

beforeAll(async () => {
  const read = readPluginFile(source, "game-news.ts");
  if (!read.ok) throw new Error(read.message);
  manifest = read.manifest;
  hosts = read.manifest.network?.hosts ?? [];
  const prepared = await runner.prepare(source, read.language);
  if (!prepared.ok) throw new Error(prepared.message);
  runner.load("game-news", prepared.code, read.manifest.apiVersion);
}, 30_000);
afterAll(() => runner.close());
beforeEach(() => {
  store = new Map(); sent = []; scheduled = []; cancelled = []; asked = []; logged = []; web = []; failures.length = 0;
  settings = { updatesChannel: U, freeChannel: F, driversChannel: D, games: [], language: "de", interval: "30", epic: true, gamerpower: true, loot: false, nvidia: true, intel: true };
});
/** Games as they stand in the settings after a save, followed since an hour ago. */
const follow = (...list: [number, string, ("all" | "patch")?][]) => {
  settings.games = list.map(([id, name, show]) => ({ game: `${name} (${id})`, show: show ?? "all" }));
  store.set("games", list.map(([id]) => ({ id, since: nowSeconds() - 3600, seen: [] })));
};

describe("the schedule", () => {
  it("starts a round a few seconds after it was switched on or its settings were saved", async () => {
    for (const event of ["enable", "settings.change"]) {
      scheduled = []; cancelled = [];
      await runner.invoke("game-news", event, {}, ctx(event));
      expect(cancelled).toEqual(["step"]);
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0]).toMatchObject({ name: "round", key: "round" });
      expect(scheduled[0]!.when - Date.now()).toBeGreaterThan(2000);
      expect(scheduled[0]!.when - Date.now()).toBeLessThan(8000);
    }
  }, 30_000);

  it("plans the next round first, then the first step, and asks nothing itself", async () => {
    settings.interval = "60";
    await job("round");
    expect(scheduled.map((s) => [s.name, s.key])).toEqual([["round", "round"], ["step", "step"]]);
    expect(Math.round((scheduled[0]!.when - Date.now()) / 60_000)).toBe(60);
    expect(scheduled[1]!.payload).toEqual({ i: 0, u: 0, f: 0 });
    expect(asked).toEqual([]);
  }, 30_000);

  it("asks one source per step, in order, and only the kinds that have a channel", async () => {
    follow([730, "Counter-Strike 2"], [10, "Counter-Strike"]);
    web = [[`${STEAM}`, steamAnswer(0, [])], [EPIC, epicAnswer([])], [GP, []], [NVIDIA, nvidiaAnswer("621.24")], [INTEL, intelPage("32.0.101.9175")], [DETAILS, { "730": { success: true, data: { name: "Counter-Strike 2" } } }]];
    for (let i = 0; i < 7; i++) await step(i);
    // The last step of a round looks one game's small picture up (the cards' corner).
    expect(asked.map((a) => new URL(a).host)).toEqual(["api.steampowered.com", "api.steampowered.com", "store-site-backend-static.ak.epicgames.com", "www.gamerpower.com", "gfwsl.geforce.com", "www.intel.com", "store.steampowered.com"]);
    expect(asked[0]).toContain("appid=730");
    expect(asked[1]).toContain("appid=10");
    // Each step schedules the one after it, a few seconds later; the last one schedules nothing.
    expect(scheduled.map((s) => (s.payload as { i: number }).i)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(scheduled[0]!.when - Date.now()).toBeGreaterThan(2000);
    // Without a channel for updates and drivers only the free games are left.
    asked = []; scheduled = [];
    delete settings.updatesChannel; delete settings.driversChannel;
    await step(0); await step(1); await step(2);
    expect(asked.map((a) => new URL(a).host)).toEqual(["store-site-backend-static.ak.epicgames.com", "www.gamerpower.com"]);
    expect(failures).toEqual([]);
  }, 30_000);

  it("goes on with the next source when one fails, and says so in its log", async () => {
    follow([730, "Counter-Strike 2"]);
    web = [[STEAM, "<html>Service Unavailable</html>"], [GP, []], [NVIDIA, "{}"], [INTEL, "<html><head></head></html>"]]; // Steam sends no JSON, Epic does not answer, NVIDIA an empty object, Intel a page without the version
    for (let i = 0; i < 5; i++) await step(i);
    expect(failures).toEqual([]);
    expect(sent).toEqual([]);
    expect(scheduled.map((s) => (s.payload as { i: number }).i)).toEqual([1, 2, 3, 4, 5]);
    expect(logged.filter((l) => l.startsWith("warn:")).map((l) => l.split(":")[1]!.trim().split(" ")[0])).toEqual(["steam", "epic", "nvidia", "intel"]);
  }, 30_000);
});

describe("game updates from Steam", () => {
  it("posts what appeared since the game was added, oldest first, once", async () => {
    follow([730, "Counter-Strike 2"]);
    const t = nowSeconds();
    web = [[STEAM, steamAnswer(730, [
      news("3", t - 60, "Counter-Strike 2 Update", "[p]\\[ MISC ][/p][list][*][p]Fixed a rendering hang on DX11[/p][/*][*][p]Improved stability[/p][/*][/list]"),
      news("2", t - 600, "Release Notes for today", "[p]Smaller fixes.[/p]"),
      news("1", t - 7200, "From before", "[p]Old.[/p]"), // before the game was followed
    ])]];
    await step(0);
    expect(sent.map((m) => m.channelId)).toEqual([U, U]);
    expect(sent[0]!.content).toBe("🎮 **Counter-Strike 2** · Update: **Release Notes for today**\nSmaller fixes.\nhttps://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/2");
    expect(sent[1]!.content).toBe("🎮 **Counter-Strike 2** · Update: **Counter-Strike 2 Update**\n\\[ MISC \\]\n• Fixed a rendering hang on DX11\n• Improved stability\nhttps://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/3");
    expect(games()[0]!.seen).toEqual(["2", "3"]);
    expect(scheduled.at(-1)!.payload).toEqual({ i: 1, u: 2, f: 0 });
    // The same answer again: nothing new.
    sent = [];
    await step(0);
    expect(sent).toEqual([]);
  }, 30_000);

  it("posts every announcement of a game, and tells an update by Steam's tag or by the title", async () => {
    follow([1867240, "WARDOGS"]);
    const t = nowSeconds();
    // As Steam served them on 15 November 2026: none of the first three carries the tag "patchnotes".
    web = [[STEAM, steamAnswer(1867240, [
      news("13", t - 10, "WARDOGS | SEASON 03 IS NOW LIVE", "[p]Servers are back.[/p]", []),
      news("12", t - 20, "WARDOGS | Season 03 Patch Notes", "[p]Fixes.[/p]", ["mod_reviewed"]),
      news("11", t - 30, "Hotfix 0.2.1", "", []),
      news("10", t - 40, "Dispatches from the front", "", ["patchnotes"]),
    ])]];
    await step(0);
    expect(sent.map((m) => m.content.split("\n")[0])).toEqual([
      "🎮 **WARDOGS** · Update: **Dispatches from the front**", // the tag
      "🎮 **WARDOGS** · Update: **Hotfix 0.2.1**", // the title
      "🎮 **WARDOGS** · Update: **WARDOGS \\| Season 03 Patch Notes**",
      "🎮 **WARDOGS** · Neuigkeit: **WARDOGS \\| SEASON 03 IS NOW LIVE**",
    ]);
  }, 30_000);

  it("keeps to patch notes for a game set to them, per game, and does not bring the others up later", async () => {
    follow([730, "Counter-Strike 2", "patch"], [10, "Counter-Strike", "all"]);
    const t = nowSeconds();
    const answer = (id: number) => steamAnswer(id, [news(`${id}-5`, t - 60, "Winter sale", "[p]Everything is cheaper.[/p]", []), news(`${id}-4`, t - 120, "Patch 1.2", "[p]Fixes.[/p]")]);
    web = [[`${STEAM}730&`, answer(730)], [`${STEAM}10&`, answer(10)]];
    await step(0);
    await step(1, 1);
    expect(sent.map((m) => m.content.split("\n")[0])).toEqual([
      "🎮 **Counter-Strike 2** · Update: **Patch 1.2**",
      "🎮 **Counter-Strike** · Update: **Patch 1.2**",
      "🎮 **Counter-Strike** · Neuigkeit: **Winter sale**",
    ]);
    expect(games().map((g) => g.seen)).toEqual([["730-4", "730-5"], ["10-4", "10-5"]]);
    // Switched to "all announcements" afterwards: what was left out is not posted late.
    settings.games = [{ game: "Counter-Strike 2 (730)", show: "all" }, { game: "Counter-Strike (10)", show: "all" }];
    sent = [];
    await step(0);
    expect(sent).toEqual([]);
  }, 30_000);

  it("turns foreign text into plain text: no mention, no link, no formatting, no pictures, a bounded length", async () => {
    follow([730, "Counter-Strike 2"]);
    const t = nowSeconds();
    const contents = `[img]{STEAM_CLAN_IMAGE}/1/abc.png[/img][h1]Big <@${SOMEBODY}> news[/h1][p]See https://evil.example/x and [url=https://evil.example/y]this[/url] **now** &amp; _later_[/p]${"[p]A long line of text that goes on. [/p]".repeat(40)}`;
    web = [[STEAM, steamAnswer(730, [{ ...news("9", t - 5, `**Hi** <@${SOMEBODY}> # [x](https://evil.example)`, contents), url: "javascript:alert(1)" }])]];
    await step(0);
    expect(sent).toHaveLength(1);
    const text = sent[0]!.content;
    expect(text).not.toContain("<@");
    expect(text).not.toContain("evil.example");
    expect(text).not.toContain("STEAM_CLAN_IMAGE");
    expect(text).not.toContain("javascript:");
    const lines = text.split("\n");
    expect(lines[0]).toBe(`🎮 **Counter-Strike 2** · Update: **\\*\\*Hi\\*\\* @${SOMEBODY} \\# \\[x\\](**`);
    expect(lines[1]).toBe("Big news"); // what stands in angle brackets is taken for a tag and goes
    expect(lines[2]).toBe("See and this \\*\\*now\\*\\* & \\_later\\_");
    expect(lines.at(-2)).toBe("…");
    // A link the source sent that is no address of Steam is replaced by the game's news page.
    expect(lines.at(-1)).toBe("https://store.steampowered.com/news/app/730");
    expect(text.length).toBeLessThan(800);
  }, 30_000);

  it("posts at most five per round and brings the rest with the next one", async () => {
    follow([730, "Counter-Strike 2"]);
    const t = nowSeconds();
    web = [[STEAM, steamAnswer(730, [3, 2, 1].map((n) => news(String(n), t - 100 + n, `Patch ${n}`, "")))]];
    await step(0, 4); // four updates were posted in this round already
    expect(sent.map((m) => m.content.split("\n")[0])).toEqual(["🎮 **Counter-Strike 2** · Update: **Patch 1**"]);
    expect(games()[0]!.seen).toEqual(["1"]);
    sent = [];
    await step(0, 5); // the round is full
    expect(sent).toEqual([]);
    await step(0); // the next round
    expect(sent.map((m) => m.content.split("\n")[0])).toEqual(["🎮 **Counter-Strike 2** · Update: **Patch 2**", "🎮 **Counter-Strike 2** · Update: **Patch 3**"]);
  }, 30_000);
});

describe("free games", () => {
  it("posts what Epic gives away right now: not what is only cheaper, not what comes next week, not twice", async () => {
    settings.gamerpower = false;
    const upcoming = { promotionalOffers: [], upcomingPromotionalOffers: [{ promotionalOffers: [{ startDate: "2098-01-01T16:00:00.000Z", endDate: "2099-01-01T16:00:00.000Z", discountSetting: { discountPercentage: 0 } }] }] };
    web = [[EPIC, epicAnswer([
      epicGame({}),
      epicGame({ id: "next-week", title: "Alien: Isolation", price: { totalPrice: { discountPrice: 3999, originalPrice: 3999 } }, promotions: upcoming }),
      epicGame({ id: "cheaper", title: "TerraScape", price: { totalPrice: { discountPrice: 459, originalPrice: 1529 } }, promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: "2020-01-01T16:00:00.000Z", endDate: "2099-01-01T16:00:00.000Z", discountSetting: { discountPercentage: 70 } }] }] } }),
      epicGame({ id: "always-free", title: "Free to play", promotions: null }),
      epicGame({ id: "addon", title: "Some add-on", offerType: "ADD_ON" }),
      epicGame({ id: "no-slug", title: "Winter <@game> *deal*", catalogNs: { mappings: [] }, productSlug: "../../evil", promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: "2020-01-01T16:00:00.000Z", endDate: "2099-01-15T16:00:00.000Z", discountSetting: { discountPercentage: 0 } }] }] } }),
    ])]];
    await step(0);
    expect(asked[0]).toBe(`${EPIC}?locale=de&country=DE&allowCountries=DE`);
    expect(sent.map((m) => [m.channelId, m.content])).toEqual([
      [F, "🎁 **Kostenlos im Epic Games Store: Knightica** · bis 1.7., 17:00 Uhr\nhttps://store.epicgames.com/de/p/knightica-3be45c"], // summer time
      [F, "🎁 **Kostenlos im Epic Games Store: Winter @game \\*deal\\*** · bis 15.1., 17:00 Uhr\nhttps://store.epicgames.com/de/free-games"], // winter time, no usable page name
    ]);
    sent = [];
    await step(0);
    expect(sent).toEqual([]);
    // English, and with add-ons wanted: only the add-on is new.
    settings.language = "en"; settings.loot = true;
    await step(0);
    expect(asked.at(-1)).toBe(`${EPIC}?locale=en-US&country=US&allowCountries=US`);
    expect(sent.map((m) => m.content)).toEqual(["🎁 **Free on the Epic Games Store: Some add-on** · until Jul 1, 15:00 UTC\nhttps://store.epicgames.com/en-US/p/knightica-3be45c"]);
  }, 30_000);

  it("starts silently with GamerPower's list, then posts new giveaways with the link back its terms ask for", async () => {
    settings.epic = false;
    web = [[GP, [giveaway(12), giveaway(11)]]];
    await step(0);
    expect(asked[0]).toBe(`${GP}?platform=pc&type=game`);
    expect(sent).toEqual([]);
    web = [[GP, [giveaway(14, { worth: "N/A", end_date: "N/A", title: "<@x> **Bold** game" }), giveaway(13), giveaway(12), giveaway(11)]]];
    await step(0);
    expect(sent.map((m) => [m.channelId, m.content])).toEqual([
      [F, "🎁 **Kostenlos: Game 13 (Steam) Giveaway**\nPC, Steam · statt $19.99 · bis 16.1.\nClaim it and keep it forever.\nhttps://www.gamerpower.com/game-13-giveaway\nQuelle: GamerPower"],
      [F, "🎁 **Kostenlos: @x \\*\\*Bold\\*\\* game**\nPC, Steam\nClaim it and keep it forever.\nhttps://www.gamerpower.com/game-14-giveaway\nQuelle: GamerPower"],
    ]);
    sent = [];
    await step(0);
    expect(sent).toEqual([]);
    // With add-ons switched on the list is another one: it starts silently again instead of posting eighty add-ons.
    settings.loot = true;
    web = [[GP, [giveaway(20, { type: "DLC" }), giveaway(14), giveaway(13)]]];
    await step(0);
    expect(asked.at(-1)).toBe(`${GP}?platform=pc`);
    expect(sent).toEqual([]);
    web = [[GP, [giveaway(21, { type: "DLC", gamerpower_url: "https://evil.example/x" }), giveaway(20, { type: "DLC" })]]];
    await step(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.content).toContain("\nhttps://www.gamerpower.com/\nQuelle: GamerPower");
  }, 30_000);

  it("leaves Epic's giveaways to Epic's own list, and shares the round's five posts between both", async () => {
    web = [[GP, []]];
    await step(1);
    web = [[GP, [giveaway(31), giveaway(30, { platforms: "PC, Epic Games Store" })]]];
    await step(1);
    expect(sent.map((m) => m.content.split("\n")[0])).toEqual(["🎁 **Kostenlos: Game 31 (Steam) Giveaway**"]);
    web = [[GP, [32, 33, 34].map((n) => giveaway(n))]];
    sent = [];
    await step(1, 0, 4); // Epic posted four in this round
    expect(sent).toHaveLength(1);
    expect(scheduled.at(-1)!.payload).toEqual({ i: 2, u: 0, f: 5 });
    await step(1);
    expect(sent).toHaveLength(3);
  }, 30_000);
});

describe("graphics drivers", () => {
  it("remembers the first NVIDIA version it sees and posts the next one", async () => {
    delete settings.updatesChannel; delete settings.freeChannel; settings.intel = false;
    web = [[NVIDIA, nvidiaAnswer("621.24")]];
    await step(0);
    expect(sent).toEqual([]);
    expect(store.get("drivers")).toEqual({ nvidia: "621.24" });
    await step(0);
    expect(sent).toEqual([]);
    web = [[NVIDIA, nvidiaAnswer("622.10")]];
    await step(0);
    expect(sent.map((m) => [m.channelId, m.content])).toEqual([[D, "🖥️ **NVIDIA GeForce Game Ready Driver 622.10** · 12.11.2026\nhttps://www.nvidia.com/en-us/drivers/details/285320/"]]);
    settings.language = "en"; sent = [];
    web = [[NVIDIA, nvidiaAnswer("623.01")]];
    await step(0);
    expect(sent[0]!.content.split("\n")[0]).toBe("🖥️ **NVIDIA GeForce Game Ready Driver 623.01** · Nov 12, 2026");
  }, 30_000);

  it("reads Intel's version from the head of its download page, next to NVIDIA's", async () => {
    delete settings.updatesChannel; delete settings.freeChannel;
    web = [[NVIDIA, nvidiaAnswer("621.24")], [INTEL, intelPage("32.0.101.9175")]];
    await step(0); await step(1);
    expect(sent).toEqual([]);
    expect(store.get("drivers")).toEqual({ nvidia: "621.24", intel: "32.0.101.9175" });
    web = [[NVIDIA, nvidiaAnswer("621.24")], [INTEL, intelPage("32.0.101.9200")]];
    await step(0); await step(1);
    expect(sent.map((m) => [m.channelId, m.content])).toEqual([[D, `🖥️ **Intel Arc Graphics Treiber 32.0.101.9200** · 4.11.2026\n${INTEL}`]]);
    expect(store.get("drivers")).toEqual({ nvidia: "621.24", intel: "32.0.101.9200" });
    // A page of 30 KB is read without coming near an event's CPU time.
    expect(failures).toEqual([]);
  }, 30_000);
});

describe("the games list of the settings", () => {
  const cs2 = { "730": { success: true, data: { name: "Counter-Strike 2", type: "game" } } };
  const searches: [string, unknown][] = [
    [`${DETAILS}730&`, cs2],
    [`${DETAILS}42&`, { "42": { success: false } }],
    [`${SEARCH}Cyberpunk%202077`, { total: 2, items: [{ type: "app", name: "Cyberpunk 2077", id: 1091500 }, { type: "app", name: "Cyberpunk 2077: Phantom Liberty", id: 2138330 }] }],
    [`${SEARCH}counter`, { total: 3, items: [{ type: "app", name: "Counter-Strike 2", id: 730 }, { type: "app", name: "Counter-Strike", id: 10 }, { type: "bundle", name: "Counter bundle", id: 5 }] }],
    [`${SEARCH}nothing`, { total: 0, items: [] }],
  ];

  it("looks a game up by its number, its store page or its name, and writes the entry as name and number", async () => {
    web = searches;
    const r = await save([{ game: "730", show: "patch" }, { game: " Cyberpunk 2077 " }]);
    expect(r).toEqual({ ok: true, games: [{ game: "Counter-Strike 2 (730)", show: "patch" }, { game: "Cyberpunk 2077 (1091500)", show: "all" }] });
    asked = [];
    // Saved again unchanged: nothing is asked. The address of the store page is a number too.
    expect((await save(r.ok ? r.games : [])).ok).toBe(true);
    expect(asked).toEqual([]);
    settings.games = [];
    expect(await save([{ game: "https://store.steampowered.com/app/730/CounterStrike_2/" }])).toEqual({ ok: true, games: [{ game: "Counter-Strike 2 (730)", show: "all" }] });
    expect(asked).toEqual([`${DETAILS}730&filters=basic`]);
    expect(failures).toEqual([]);
  }, 30_000);

  it("refuses the save with a sentence at the field when Steam knows nothing, several games fit, or Steam is down", async () => {
    web = searches;
    const several = await save([{ game: "Counter-Strike 2 (730)", show: "all" }, { game: "counter" }]);
    expect(several).toEqual({ ok: false, fieldErrors: { games: { en: 'Several games fit "counter": Counter-Strike 2 (730), Counter-Strike (10). Enter the number.', de: "Zu „counter“ passen mehrere Spiele: Counter-Strike 2 (730), Counter-Strike (10). Trage die Nummer ein." } } });
    expect(settings.games).toEqual([]); // nothing was saved
    const two = await save([{ game: "42" }, { game: "nothing" }]);
    expect(two.ok).toBe(false);
    expect((two as { fieldErrors: { games: { de: string } } }).fieldErrors.games.de).toBe("Steam kennt kein Spiel mit der Nummer 42. Steam findet nichts zu „nothing“.");
    const down = await save([{ game: "some game" }]);
    expect((down as { fieldErrors: { games: { de: string } } }).fieldErrors.games.de).toBe("Steam antwortet gerade nicht („some game“). Speichere gleich noch einmal.");
  }, 30_000);

  it("keeps a game once, drops empty rows, and looks up at most five new games per save", async () => {
    web = searches;
    expect(await save([{ game: "730" }, { game: "" }, { game: "Counter-Strike 2 (730)", show: "patch" }, { show: "patch" }])).toEqual({ ok: true, games: [{ game: "Counter-Strike 2 (730)", show: "all" }] });
    asked = [];
    web = [[DETAILS, cs2]];
    const many = await save(Array.from({ length: 6 }, (_, i) => ({ game: String(100 + i) })));
    expect(many.ok).toBe(false);
    expect((many as { fieldErrors: { games: { de: string } } }).fieldErrors.games.de).toContain("höchstens 5 neue Spiele");
    expect(asked).toHaveLength(5);
  }, 30_000);

  it("starts a game that is new in the list at now and forgets one that left it", async () => {
    store.set("games", [{ id: 10, since: 1_700_000_000, seen: ["a"] }, { id: 99, since: 1_700_000_000, seen: [] }]);
    settings.games = [{ game: "Counter-Strike (10)", show: "all" }, { game: "Counter-Strike 2 (730)", show: "all" }, { game: "typed while the plugin was off", show: "all" }];
    const before = nowSeconds();
    await runner.invoke("game-news", "settings.change", {}, ctx("settings.change"));
    expect(games().map((g) => g.id)).toEqual([10, 730]);
    expect(games()[0]).toEqual({ id: 10, since: 1_700_000_000, seen: ["a"] });
    expect(games()[1]!.since).toBeGreaterThanOrEqual(before);
    // An entry that was never looked up is not asked for; it waits for the next save.
    web = [[STEAM, steamAnswer(0, [])], [EPIC, epicAnswer([])], [GP, []], [NVIDIA, nvidiaAnswer("1.0")], [INTEL, intelPage("1.0.0.1")]];
    for (let i = 0; i < 6; i++) await step(i);
    expect(asked.filter((a) => a.startsWith(STEAM))).toHaveLength(2);
  }, 30_000);

  it("shows the followed games in the admin's table", async () => {
    store.set("games", [{ id: 730, since: 1_800_000_000, seen: ["1"] }, { id: 10, since: 1_700_000_000, seen: [] }]);
    settings.games = [{ game: "Counter-Strike 2 (730)", show: "patch" }, { game: "Counter-Strike (10)", show: "all" }];
    const rows = (await runner.invoke("game-news", "view", { view: "games" }, ctx("view"))).value;
    expect(rows).toEqual([
      { name: "Counter-Strike", appId: "10", show: "alle Ankündigungen", since: 1_700_000_000_000 },
      { name: "Counter-Strike 2", appId: "730", show: "nur Patchnotes", since: 1_800_000_000_000 },
    ]);
  }, 30_000);
});

describe("the card of a post", () => {
  const CAPSULE = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1867240/057e/capsule_231x87.jpg?t=1";
  const patchNotes = `[p][img src="{STEAM_CLAN_IMAGE}/45973082/b59cafaccf45ad3c91a3c53b2a573211fc2b9600.jpg"][/img][/p][h2]WARDOGS SEASON 03 Trailer[/h2][p][b]Early Access Season 03 drops TOMORROW.[/b][/p][previewyoutube="SKeLS41KLNo;full"][/previewyoutube][p][/p][quote][p][b]⚠ Scheduled Maintenance[/b] [b]Window[/b]\nThere will be a window on [b]November 12th[/b].[/p][/quote][h1]// Season 03 Patch Notes[/h1][h3][b]New Map: SABATULO[/b][/h3][list][*][p]Tight streets[/p][/*][*][p]High-rises[/p][/*][/list]`;

  it("carries the game, the title as a link, the text with its headings, quotes and lists, and both pictures", async () => {
    follow([1867240, "WARDOGS"]);
    store.set("art", { "1867240": { url: CAPSULE, at: nowSeconds() } });
    web = [[STEAM, steamAnswer(1867240, [news("7", nowSeconds() - 30, "WARDOGS | Season 03 Patch Notes", patchNotes)])]];
    await step(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.card).toEqual({
      kicker: "WARDOGS · Update", title: "WARDOGS | Season 03 Patch Notes",
      url: "https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/7",
      text: "### WARDOGS SEASON 03 Trailer\n\n**Early Access Season 03 drops TOMORROW.**\n\n> **⚠ Scheduled Maintenance Window**\n> There will be a window on **November 12th**.\n\n### // Season 03 Patch Notes\n### New Map: SABATULO\n\n- Tight streets\n- High-rises",
      image: "https://clan.akamai.steamstatic.com/images/45973082/b59cafaccf45ad3c91a3c53b2a573211fc2b9600.jpg",
      thumbnail: CAPSULE,
    });
    // The message's own text still says it all, for an app from before cards.
    expect(sent[0]!.content).toContain("🎮 **WARDOGS** · Update: **WARDOGS \\| Season 03 Patch Notes**");
    expect(failures).toEqual([]);
  }, 30_000);

  it("takes the still of the first video when an announcement has no picture, and no picture when it has neither", async () => {
    follow([1867240, "WARDOGS"]);
    const t = nowSeconds();
    web = [[STEAM, steamAnswer(1867240, [news("2", t - 20, "Now live", '[p]Servers are back.[/p][previewyoutube="SKeLS41KLNo;full"][/previewyoutube]', []), news("1", t - 40, "Hello", "[p]Just words.[/p]", [])])]];
    await step(0);
    expect(sent.map((m) => m.card?.image)).toEqual([undefined, "https://i.ytimg.com/vi/SKeLS41KLNo/mqdefault.jpg"]);
    expect(sent.map((m) => m.card?.thumbnail)).toEqual([undefined, undefined]);
    expect(sent[0]!.card).toEqual({ kicker: "WARDOGS · Neuigkeit", title: "Hello", url: "https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1", text: "Just words." });
  }, 30_000);

  it("lets foreign text bring no formatting, mention, address or picture of its own into a card", async () => {
    follow([730, "Counter-Strike 2"]);
    const contents = `[img]https://evil.example/pixel.png[/img][img src="{STEAM_CLAN_IMAGE}/../../evil/x.png"][/img][h1]Big <@${SOMEBODY}> news \uE000x\uE001[/h1][p]See https://evil.example/x and [url=https://evil.example/y]this[/url] **now** # not a heading\n> not a quote [b]bold[/b][b][/b] [b]open[/p]`;
    web = [[STEAM, steamAnswer(730, [{ ...news("9", nowSeconds() - 5, `**Hi** <@${SOMEBODY}> [x](https://evil.example)`, contents), url: "javascript:alert(1)" }])]];
    await step(0);
    const card = sent[0]!.card!;
    expect(card.title).toBe(`**Hi** @${SOMEBODY} [x](`); // a title is shown as plain text, so nothing in it is formatting
    expect(card.url).toBe("https://store.steampowered.com/news/app/730");
    expect(card.image).toBeUndefined();
    expect(card.text).toBe("### Big news x\n\nSee and this \\*\\*now\\*\\* \\# not a heading\nnot a quote bold open"); // bold marks that do not pair up are dropped, the words stay
    expect(JSON.stringify(card)).not.toContain("evil.example");
    expect(JSON.stringify(card)).not.toContain("<@");
  }, 30_000);

  it("bounds the text of a card", async () => {
    follow([730, "Counter-Strike 2"]);
    web = [[STEAM, steamAnswer(730, [news("9", nowSeconds() - 5, "Long", "[p]A long line of text that goes on. [/p]".repeat(60))])]];
    await step(0);
    const text = sent[0]!.card!.text!;
    expect(text.split("\n").filter(Boolean).length).toBeLessThanOrEqual(13);
    expect(text.endsWith("\n\n…")).toBe(true);
    expect(text.length).toBeLessThan(800);
  }, 30_000);

  it("remembers a game's small picture when the game is looked up, and looks one up per round for a game without", async () => {
    web = [
      [`${DETAILS}730&`, { "730": { success: true, data: { name: "Counter-Strike 2", capsule_image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/capsule_231x87.jpg?t=2" } } }],
      [`${SEARCH}wardogs`, { total: 1, items: [{ type: "app", name: "WARDOGS", id: 1867240, tiny_image: CAPSULE }] }],
      [`${DETAILS}10&`, { "10": { success: true, data: { name: "Counter-Strike", capsule_image: "https://evil.example/capsule.jpg", header_image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/10/header.jpg" } } }],
    ];
    expect((await save([{ game: "730" }, { game: "wardogs" }])).ok).toBe(true);
    const art = () => store.get("art") as Record<string, { url: string; at: number }>;
    expect(Object.keys(art()).sort()).toEqual(["1867240", "730"]);
    expect(art()["1867240"]!.url).toBe(CAPSULE);
    // A game that stands in the list without a picture (saved by an earlier version): the round's last step fetches it.
    settings.games = [...(settings.games as Entry[]), { game: "Counter-Strike (10)", show: "all" }];
    asked = [];
    delete settings.freeChannel; delete settings.driversChannel;
    await step(3); // three games, then the picture step
    expect(asked).toEqual([`${DETAILS}10&filters=basic`]);
    expect(art()["10"]!.url).toBe("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/10/header.jpg"); // an address on another host is not taken
    // Every game has a fresh picture now: the step asks nothing, and a game that left the list is forgotten.
    asked = [];
    settings.games = (settings.games as Entry[]).slice(1);
    await step(2);
    expect(asked).toEqual([]);
    expect(Object.keys(art()).sort()).toEqual(["10", "1867240"]);
    expect(failures).toEqual([]);
  }, 30_000);

  it("draws free games and drivers as cards too", async () => {
    web = [
      [EPIC, epicAnswer([epicGame({ description: "A *tactical* game.", keyImages: [{ type: "Thumbnail", url: "https://cdn1.epicgames.com/t.jpg" }, { type: "OfferImageWide", url: "https://cdn1.epicgames.com/offer/wide.jpg" }] }), epicGame({ id: "other", title: "Other", keyImages: [{ type: "OfferImageWide", url: "https://evil.example/wide.jpg" }] })])],
      [GP, [giveaway(2, { image: "https://www.gamerpower.com/offers/1b/2.jpg" })]],
      [NVIDIA, nvidiaAnswer("621.30")],
    ];
    store.set("free", { epic: [], gp: [1], gpMode: "game" });
    store.set("drivers", { nvidia: "621.24" });
    await step(0); await step(1); await step(2);
    expect(sent.map((m) => m.card?.kicker)).toEqual(["Epic Games Store · Kostenlos", "Epic Games Store · Kostenlos", "Kostenlos", "NVIDIA · Grafiktreiber"]);
    expect(sent[0]!.card).toMatchObject({ title: "Knightica", url: "https://store.epicgames.com/de/p/knightica-3be45c", image: "https://cdn1.epicgames.com/offer/wide.jpg" });
    expect(sent[0]!.card!.text).toMatch(/^\*\*Kostenlos\*\* bis 1\.7\., \d\d:00 Uhr\nA \\\*tactical\\\* game\.$/);
    expect(sent[1]!.card!.image).toBeUndefined(); // a picture that is not on Epic's hosts is left out
    expect(sent[2]!.card).toMatchObject({ title: "Game 2 (Steam) Giveaway", url: "https://www.gamerpower.com/game-2-giveaway", image: "https://www.gamerpower.com/offers/1b/2.jpg" });
    expect(sent[2]!.card!.text).toContain("Quelle: [GamerPower](https://www.gamerpower.com/)");
    expect(sent[3]!.card).toMatchObject({ title: "GeForce Game Ready Driver 621.30", text: "Veröffentlicht am 12.11.2026" });
    expect(failures).toEqual([]);
  }, 30_000);
});

describe("the manifest", () => {
  it("names every host the plugin asks, and the plugin asks no other", () => {
    expect(manifest.capabilities).toEqual(["messages.write", "net.fetch"]);
    expect(manifest.commands).toEqual([]);
    const inCode = new Set([...source.slice(source.indexOf("*/")).matchAll(/["`]https:\/\/([a-z0-9.-]+)\/[^"`]*["`]/g)].map((m) => m[1]!));
    // Addresses the plugin only writes into a message are no hosts it fetches from.
    // Nor are the hosts of a card's pictures: the plugin names those addresses, the server fetches them like a preview's picture.
    for (const posted of ["store.epicgames.com", "www.nvidia.com", "squorli.com", "clan.akamai.steamstatic.com", "i.ytimg.com"]) inCode.delete(posted);
    expect([...inCode].sort()).toEqual([...manifest.network!.hosts].sort());
  });

  it("declares the games as a list whose entries the server takes", () => {
    const field = manifest.settings.find((f) => f.key === "games")!;
    expect(field.type).toBe("list");
    expect(checkValues([field], { games: [{ game: "  Counter-Strike 2 (730) ", show: "patch" }, { game: "x" }, { show: "all" }] })).toEqual({ ok: true, values: { games: [{ game: "Counter-Strike 2 (730)", show: "patch" }, { game: "x", show: "all" }] } });
    expect(checkValues([field], { games: [{ game: "x", show: "sometimes" }] })).toEqual({ ok: false, errors: { games: "invalid" } });
    expect(checkValues([field], { games: Array.from({ length: 51 }, (_, i) => ({ game: `g${i}` })) })).toEqual({ ok: false, errors: { games: "too_long" } });
    expect(checkValues([field], {})).toEqual({ ok: true, values: { games: [] } });
  });
});
