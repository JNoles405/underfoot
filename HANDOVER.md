# Underfoot: handover

## 1. What it is

A falling-sand ant farm that runs in the browser. Sand, water, crumbs and eggs are
grid cells; ants and the queen are agents on top of the grid. The colony digs on
its own, workers carry crumbs to the queen, she lays an egg for every two crumbs,
and eggs hatch into workers.

- One self-contained file, `underfoot.html`. Vanilla JS and Canvas 2D. No build step, no dependencies.
- Fonts come from Google Fonts (Bricolage Grotesque, Figtree, JetBrains Mono), each with a system fallback.
- Played as a private Claude artifact: https://claude.ai/artifact/Nj1KucKdfZLcxEmuFpAXCD
- Repo: https://github.com/JNoles405/underfoot (branch `main`). A push does **not** update the artifact; it is republished separately.
- Qoder project id: `38d09e61-6080-49d6-a753-950db6093af9`

## 2. Standing constraints

- The file has **no** `<!doctype>`, `<html>`, `<head>` or `<body>`. The Artifact publisher wraps it in its own skeleton. Do not add them.
- Artifact CSP: scripts only from the allowed CDNs, stylesheets only from Google Fonts. Everything else stays inline.
- Original game. It uses the falling-sand genre and the ant-farm idea, not any existing game's name, art or levels.
- No data leaves the page. Nothing is stored, not even in localStorage.
- **No outlines or halos around ants** (owner's call, 2026-11-22, after v1.2 shipped them). Ant visibility comes from their own colours: a black gaster and a rust-red head and thorax.

## 3. How the work is run

Started 2026-11-21 in one Claude Code session, as a "fun project unrelated to past projects".
The local working copy lives at `F:\Underfoot` (moved there from the first session's temporary folder).
Edit `underfoot.html`, check it in a local preview, then republish the artifact.

## 4. Building, running, testing

There is nothing to build. To preview locally:

```
node serve.js underfoot.html
```

then open http://localhost:5291. `serve.js` wraps the page in the same minimal skeleton the
Artifact publisher adds (doctype, charset, viewport, `<body>`) and re-reads the file on every
request, so a browser reload shows edits. The port comes from `PORT` (default 5291). In Claude Code,
the `underfoot` configuration in `.claude/launch.json` runs the same command.

Opening the file straight from disk (`file://`) did not work in the app's browser pane.

The page exposes a debug handle for measurement: `window.__underfoot`
(`step()`, `render()`, `count(type)`, `queen()`, `ants` (a count), `list()` (the ant objects), `frame`, `setTrails(bool)`, `setCycle(bool)`, `setSpeed(1|2|4|"real")`, `time()` / `setTime(hour)`, `light()` (daylight 0–1), `scent()` (cells with visible scent), `remains()` (`{inside, outside}` counts of remains below and above the surface line), `spires()` (columns 6+ above the ground line), `peaks()` (`{n, hi}`: columns above row 28, and the highest sand row)).

Headless colony test (no browser needed): `node tools/colony-test.js underfoot.html 40 8000 on on 1`
(arguments after the step count: trails `on|off`, day/night `on|off`, speed `1|real`). It runs the page's script in Node with the DOM stubbed out (any canvas call is a no-op) and also prints the ants' walking speed in cells per step. Type ids: 0 empty, 1 sand, 2 stone, 3 water, 4 food, 5 egg, 6 remains.

Rendering in a real browser without the app's preview: build a wrapper file (doctype + `<body>` + the page + a test `<script>`) and run headless Chrome on it, e.g.
`chrome.exe --headless=new --virtual-time-budget=4000 --screenshot=out.png --window-size=1280,900 file:///…/wrapper.html`
or `--dump-dom` to read results the test script writes into the page. Under `--virtual-time-budget`, `performance.now()` does not advance during script execution, so time code in Node instead. Headless Chrome will not make the viewport narrower than 500 px.

To republish from a Claude session: Artifact publish with the file path (same session) or with
`url: https://claude.ai/artifact/Nj1KucKdfZLcxEmuFpAXCD` (other sessions, after reading it first).

## 5. Architecture worth knowing

- Grid is 200 × 130 cells, scaled up with `image-rendering: pixelated`. Arrays: `type`, `data`, `shade`, `flag`, `stamp`.
- `stamp[i] === frame` marks a cell already moved this step, so a particle can't move twice in one pass. `swap()` sets it on both cells.
- Update order is bottom row to top, alternating left/right per row and frame, so piles don't lean one way.
- **Packed sand rule (the reason tunnels exist).** Sand has `flag` 0 (loose, falling) or 1 (settled). Loose sand falls and slides diagonally. Settled sand never slides. Settled sand with nothing below stays put if *both* sides are anchors (settled sand, stone or the frame), and if only one side is an anchor it falls with probability 0.0006 per step. Without this, every tunnel caves in at once. Undercut overhangs crumble slowly by design.
- Sand `data` is moisture (0–255). Water next to sand soaks in; moisture spreads to drier neighbours; only sand with open air above it dries out.
- `top[x]` is the first sand/stone cell in each column, recomputed every step. **`ground[x]`** is the median of `top` over 7 columns, so a hole up to 3 cells wide does not lower it. Ants use `ground` to know they are "above ground"; drawing treats a cell as underground if it is below `min(top, ground)`. `holes` lists columns where `top > ground + 2`: the ways into the nest.
- **Getting home from the surface.** Each ant records `ex`, the column where it last crossed the ground line going up. `homeX(a)` returns that hole if it is still open, else the nearest open hole, else `queen.x`. Idle ants on the surface walk to it and go down; food carriers on the surface head for it first and only then for the queen. An idle ant standing at its home column for 240 updates digs down (the way in is plugged).
- **Spoil goes beside, along the surface.** Sand and remains carriers above ground walk along the surface (`gy = 0`) in their heading, drop only once more than 3 columns from their exit, and drop the grain beside themselves, not above.
- Ants are objects in `ants[]`, not cells. They can only stand in empty or water cells and only move to cells touching something solid (the glass is too slick to climb). Each ant has a preferred dig direction (`ddx`, `ddy`) chosen at birth, which is what makes tunnels branch outward and down.
- Ant priorities: carrying sand → go up, drop it above ground. Carrying food → go to the queen. Otherwise → pick up adjacent food, else head for the nearest crumb within 75 cells (`foodList`, rebuilt every 15 steps), else dig.
- Ants carrying food or chasing a target delete a blocking sand cell when stuck. This loses a little sand over time (about 400 of 17,000 cells in 11,000 steps). Accepted.
- **Pheromone trails** (`pher`, a Float32Array, 0–1, switch `trails`, key T). An ant carrying food stamps `pher[cell] = max(pher, a.trail)`; `a.trail` starts at 1 on pickup and is multiplied by 0.994 per move, so scent is **strongest near the food** and following it uphill leads there. Each step the field is multiplied by `PHER_FADE` (0.9993, half-life about 990 steps) and wiped on any cell that is not empty, so poured sand or water erases it. Only ants with `nose` (60%, set at birth) follow trails, so the rest keep digging. An ant at the strong end of a trail with no crumb in sight gets `bored` for 600 updates. Trail-following sits below "chasing a crumb I can see" and above "dig". Turning the switch off wipes the field and restores the v1 behaviour exactly.
- **Stuck carriers dig out.** `a.hi` holds the best progress since pickup (row for sand, distance to the queen for food) and `a.stuck` counts updates without improvement. After 240, the ant digs one cell toward its goal (removing that sand) and the counter drops to 120. Without this, dumped sand slides back down the entrance shaft and plugs it, every worker inside ends up carrying a grain up to the plug, and the colony starves (19 of 40 v1 runs).
- The queen is a 3 × 2 agent. Sand that lands on her footprint is cleared. She falls if nothing is under her.
- **Drawing is two layers.** The grid is written 1:1 into an offscreen 200 × 130 canvas, drawn 4× (`S`) onto the visible 800 × 520 canvas with smoothing off, and then remains, the queen and the ants are drawn on top as small sprites (rect lists facing right, mirrored by `hx`). An ant is two-tone: `ANT_DARK` (gaster, legs) in near-black and `ANT_RED` (head, thorax) in rust red, plus `ANT_GLINT` pixels. The two tones are there so one of them always contrasts: the black gaster against light sky and sand, the red head against the night sky (a plain dark ant measured 1.04:1 there). v1.2 used a pale halo instead; the owner rejected it (see Standing constraints). The canvas uses `image-rendering: pixelated` only when shown at least at 800 device px wide (`fit()`), otherwise smooth.
- **Death and remains** (`DEAD`, type 6). An ant that dies of age or drowning becomes a `DEAD` cell where it stood (`die()`); what it carried is dropped above it. Remains fall and pile like crumbs and count as solid. `data` is decay: +1 every 64 steps, gone at 255 (about 16,300 steps, a little over one in-game day), and the sprite greys in four steps. Idle workers below ground pick up adjacent remains (30% per update) and carry them like sand, up and out, dropping them on the surface less eagerly than sand (2% vs 7% per update) so they get carried further. The body keeps its decay while carried (`a.load`). Remains are drawn as an ant on its back, over the cell's sky or tunnel colour.
- **Day and night** (`cycle`, key N). `clock` counts steps through a `DAY` of 14,400 steps (4 minutes at 60 steps a second); every new farm opens at 09:00. `daylight` (0–1) is a smoothstep ramp, 05:00–07:00 up and 18:00–20:00 down; `night` is `daylight < 0.35`. Daylight sets the sky (theme day sky → navy, warm band at dawn and dusk), the light on the farm (`lr/lg/lb`, down to 0.62 and cooler at night), stars (a fixed hash of x, y) and the sun or moon disc, which is painted only on sky cells so it sets behind the hills. At night idle ants pause 65% of updates instead of 35% and dig at half the rate; carriers are unaffected. Off = endless day, clock frozen.
- **Steps follow the wall clock.** The loop owes `dt × 60 × speed` steps per frame (at most 8), so 1× is 60 steps a second on a 120 Hz screen too. Before v1.2 it ran one step per animation frame, so high-refresh screens ran fast.
- **Real speed** (the fourth speed setting). Physics runs at 1× but each ant only updates when its `acc` budget reaches 1; `antRate` is `REAL_RATE` (0.28), so ants move at 10.4 cells/s (measured). Ageing, digging and the stuck counters are per ant update, so ants also live and dig on the slower clock; trail evaporation is scaled to `PHER_FADE ** antRate` so trails last the same number of ant steps. At `antRate` 1 the filter is identical to the old `ants.filter(updAnt)`. Scale behind the number: 2 mm a cell (a 40 × 26 cm farm, the size of a commercial ant farm; the ant sprite is about 3.5 mm), and a garden ant (*Lasius niger*) walks about 2 cm/s at room temperature, up to about 2.85 cm/s when warm.

## 6. What changed and why

- **2026-11-21, v1.** First build and publish. After the first look, tunnels were made lighter (ants were invisible on dark tunnels), digging rate raised from 0.05 to 0.14 per eligible step, and drying limited to exposed sand (all moisture was evaporating evenly).
- **2026-11-21, repo.** `serve.js` moved from the session scratchpad into the project, and `.claude/launch.json` now points at it by relative path. First commit pushed to GitHub.
- **2026-11-21, folder.** Working copy moved to `F:\Underfoot`. Dev server restarted from there and checked. (It later turned out the app still runs the server from the old folder; see Traps.)
- **2026-11-21, v1.1: pheromone trails.** Food carriers lay a violet scent trail that other workers follow to the food; a switch in the sidebar (and key T) turns the whole mechanic on or off. While measuring it, found that v1 stalled in about half of runs (shaft plugged by dumped sand, all workers stuck carrying grains), so carriers that stop making progress now dig toward their goal. Added `tools/colony-test.js`. Artifact republished (version 2).

- **2026-11-22, v1.2: day and night, visible ants, real speed.** Ants were near invisible on the dark-theme sky (1-pixel near-black ant on navy). Ants and queen are now outlined sprites drawn at 4× over the grid. Added a day/night cycle with sun, moon, stars and dusk colours, a night rest for idle workers, and a switch (key N) plus a Time stat. Added Real speed to the speed button. The loop now runs on wall-clock time. `tools/colony-test.js` takes day/night and speed arguments and reports walking speed.

- **2026-11-22, v1.4: surface ants find their way home.** Idle surface workers used to walk toward `queen.x` and crowd on the ground above her chamber, unable to get down (10–11 ants on average, about a quarter of the colony). Ants now remember the hole they came out of and go back down it. Fixing that exposed two spoil problems, also fixed: a grain dropped above the ant built thin spires, and carriers steering upward built tall peaks.
- **2026-11-22, v1.3: death and remains; no outlines.** Ants that die of age or drowning leave remains, which workers carry out of the nest and which crumble in about a day. The owner did not like the v1.2 outlines, so ants are now two-tone (black gaster, rust-red head and thorax) with no halo.

## 7. Traps already paid for

- A plain falling-sand rule collapses every tunnel. See the packed sand rule above before changing `updSand`.
- `file://` preview fails in the app's browser pane; serve over localhost instead.
- The preview server's port must come from `PORT`; a hardcoded port collided with something already on 5178.
- The preview server first lived in the session's temporary scratchpad, so `launch.json` pointed at a path that could disappear. Keep `serve.js` in the repo and reference it relatively.
- After the session moved to `F:\Underfoot`, the app's `preview_start` **kept launching `serve.js` in the old temporary folder** and served the old file, even with `cwd` or absolute paths added to `launch.json` (the app reads the original folder's config). `preview_list` shows the server's `cwd`; check it. A new session opened directly in `F:\Underfoot` should not have this problem (not yet confirmed). Until then, test logic with `tools/colony-test.js`; the switch UI in v1.1 was checked by injecting its CSS into the old page. On 2026-11-22 (same session, resumed) it still served the old folder, so v1.2 was checked in headless Chrome instead (see section 4). Claude in Chrome cannot open `file://` URLs (it rewrites them to `https://file///…`).
- Colony outcomes are bimodal and noisy: with 12 or 16 runs, trails looked both worse and better than no trails. Use 40 runs of 8000 steps before trusting a difference.
- When the Claude app moves a session to a new folder it does not copy `.git` or `.claude`. After the move, the repo was rebuilt with `git init -b main`, `git remote add origin …`, `git fetch`, `git reset origin/main`, and `.claude/launch.json` was restored with `git checkout`. Check `git status` after any such move.
- "Above ground" must not use `top[x]` directly: the entrance shaft is an open column, so `top` there is deep and an ant inside the shaft counted as on the surface. Sand carriers then dropped spoil inside the shaft, which is what kept plugging it in v1–v1.3. Use `ground`.
- Fixing one spoil rule exposes the next. Sending ants home (v1.4) made spoil land on the surface instead of back in the shaft, and the surface grew spires (grain dropped above the ant) and then 25-cell peaks (carriers steering uphill). Check a screenshot after 10,000+ steps, plus `peaks()` and `spires()`, whenever ant movement on the surface changes. A median-based metric misses wide peaks; `peaks()` uses an absolute row.
- Stats only refresh inside the `requestAnimationFrame` loop. Calling `step()` from the console does not update the numbers on screen until a frame renders.

## 8. How things are verified

Measured in the app's browser pane on 2026-11-21:

- Step cost: 0.25 ms per simulation step (200 steps averaged), so 4× speed is far inside the frame budget.
- Colony loop: from the starting farm, 10,900 steps took the queen from 0 to 59 crumbs and the colony from 16 to a peak of 43 workers. All 70 starting crumbs were eaten.
- Water: 205 cells of poured water fully soaked into the sand within 3,000 steps.
- Phone width (375 px): page scroll width equals viewport width, no sideways scroll; canvas 319 px wide.
- No console errors.

Not verified: real touch input on a phone, and the dark/light switch through the artifact viewer's own theme toggle.

v1.1, measured headless with `node tools/colony-test.js underfoot.html 40 8000 [on|off]` (40 runs each, 8000 steps from the starting farm; "stalled" = queen fed fewer than 20 crumbs):

| Build | Stalled | Mean fed | Mean peak workers | Sand lost per run |
| --- | --- | --- | --- | --- |
| v1 (commit d4cc41e) | 19 / 40 | 25.3 | 31.9 | 128 |
| v1.1, trails off | 6 / 40 | 42.6 | 38.7 | 250 |
| v1.1, trails on | 5 / 40 | 45.2 | 39.8 | 266 |

The big gain is the stuck-carrier fix. Trails add a small improvement that is within the noise; their value is mostly visible behaviour (workers recruited along a highway). Step cost with trails on: 0.23 ms against 0.22 ms off. A rendered frame at step 2500 showed the trail running from the crumb pile along the surface and down the carriers' tunnel. Switch states measured in the browser: off has a grey knob at 4 px, on has a white knob at 22 px on a violet track. Not verified: the republished artifact viewed live, and the full v1.1 page in a browser (see Traps).

v1.2, measured 2026-11-22:

- Contrast (WCAG ratio, sampled from the rendered canvas in headless Chrome, ant thorax pixel vs. halo vs. the sky three cells above):

  | Theme, time | Ant body vs. sky | Halo vs. sky | Body vs. halo |
  | --- | --- | --- | --- |
  | light, 12:00 | 13.7 | 1.3 | 10.8 |
  | dark, 12:00 | 3.2 | 3.1 | 9.9 |
  | either, 23:00 (night) | 1.04 | 8.9 | 8.6 |

  Under ground the body measured 4.1–5.8 against the tunnel. v1.1's dark-theme sky (16, 24, 40) against its near-black ant is about 1.1:1, the reported problem.
- Walking speed (headless, pauses included): 1× 0.565–0.582 cells a step (about 35 cells/s); Real speed 0.174 cells a step = 10.4 cells/s = 2.1 cm/s at 2 mm a cell.
- Colony, 40 runs × 8000 steps, trails on: day/night off 6/40 stalled, mean fed 45.1, peak workers 40.5; day/night on 7/40, mean fed 42.4, peak workers 39.0. The night rest costs a little food, within the noise. Real speed, 12 runs × 28,800 steps (two in-game days): 2/12 stalled, mean fed 40.1, peak workers 38.9. The colony keeps up because ants also age per update.
- Step cost 0.21 ms (Node, 20 ants); render's JS side 0.17 ms with canvas calls stubbed. GPU cost of the sprite draws not measured.
- Screenshots (headless Chrome, 1280 × 900): light day, dark day, dark dusk, dark night, light night all render with sun or moon, stars at night and outlined ants. At the narrowest headless viewport (500 px) page width 485 px, no sideways scroll.

v1.3, measured 2026-11-22 (headless Chrome, sampled from the rendered canvas; the v1.2 table above is for the halo design, since removed):

| Theme, time | Red head vs. sky | Black gaster vs. sky |
| --- | --- | --- |
| light, 12:00 | 3.4 | 13.0 |
| dark, 12:00 | 1.4 | 3.2 |
| dark, 19:18 (dusk) | 1.5 | 3.0 |
| either, 23:00 (night) | 4.2 | 1.1 |

Against tunnels (colour pairs, computed): by day black 2.3, red 1.9 (the red also differs in hue); at night red 3.2, black 1.4. Remains over 16,000 steps in 3 runs: 36–43 ants died; up to 15 different workers hauled a body; most deaths happen on the surface, so most remains end up there anyway. Colony, 40 runs × 8000 steps, trails and day/night on: 7/40 stalled, mean fed 42.7, peak workers 38.6 (v1.2: 7/40, 42.4, 39.0), so hauling bodies costs nothing measurable.

v1.4, measured 2026-11-22 (20 runs × 12,000 steps unless stated; scratch script sampling every 100 steps):

| Build | Idle ants crowding above the queen | Idle ants near the surface | Peak columns (above row 28) | Highest sand row |
| --- | --- | --- | --- | --- |
| v1.3 | 10.0 | 14.2 | 4.0 | 27.2 |
| v1.4 homing only (drop above, steer up) | 0.5 | 9.4 | 16.6 | 13.2 |
| v1.4 | 0.1 | 4.0 | 0.1 | 30.9 |

Colony, 40 runs × 8000 steps, day/night on: trails on 9/40 stalled, mean fed 42.2, peak workers 39.2; trails off 5/40, 47.2, 40.9. Real speed, 12 runs × 28,800 steps: 1/12 stalled, mean fed 50.5 (v1.2: 2/12, 40.1). The crowd fix did **not** reduce stalls: the stalled runs are nearly all "fed 0", a colony that never gets the first crumb home, which is a different failure. Screenshots at 11,500 steps show spoil spread as a low rough mound and ants spread along the surface.

Not verified: the v1.2/v1.3/v1.4 page in the app's own browser pane or the live artifact, real touch input, and the frame rate on a 120 Hz screen.

## 9. Outstanding

- About 1 run in 6 still stalls (fed under 20 after 8000 steps), with or without trails. These are nearly all runs where the queen is fed nothing at all: the first crumbs never get home. Not the surface crowd (fixed in v1.4, stall rate unchanged). Cause not yet diagnosed; start by watching a fed-0 run in the first 2000 steps.
- View the live artifact (now v1.2) and check trails, day/night, the ant sprites and Real speed there, ideally from a session opened directly in `F:\Underfoot` so the preview server serves this folder.
- Ideas, not commitments: saving a farm, the day following the viewer's real clock in Real speed mode.

## 10. Code conventions

- One IIFE, `"use strict"`, no globals except the `window.__underfoot` debug handle.
- Colours for the page are CSS tokens on `:root`, redefined for dark mode in both the media query and `[data-theme="dark"]`. Colours inside the farm are computed in `render()`; the sky follows the page theme through `readTheme()`.
- Probabilities are tuned per step at 60 steps a second. Changing the step rate changes the feel of everything.
