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

## 3. How the work is run

Started 2026-11-21 in one Claude Code session, as a "fun project unrelated to past projects".
The session had no project folder, so the files live in a temporary folder the app made for that session.
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
(`step()`, `count(type)`, `queen()`, `ants`, `frame`). Type ids: 0 empty, 1 sand, 2 stone, 3 water, 4 food, 5 egg.

To republish from a Claude session: Artifact publish with the file path (same session) or with
`url: https://claude.ai/artifact/Nj1KucKdfZLcxEmuFpAXCD` (other sessions, after reading it first).

## 5. Architecture worth knowing

- Grid is 200 × 130 cells, scaled up with `image-rendering: pixelated`. Arrays: `type`, `data`, `shade`, `flag`, `stamp`.
- `stamp[i] === frame` marks a cell already moved this step, so a particle can't move twice in one pass. `swap()` sets it on both cells.
- Update order is bottom row to top, alternating left/right per row and frame, so piles don't lean one way.
- **Packed sand rule (the reason tunnels exist).** Sand has `flag` 0 (loose, falling) or 1 (settled). Loose sand falls and slides diagonally. Settled sand never slides. Settled sand with nothing below stays put if *both* sides are anchors (settled sand, stone or the frame), and if only one side is an anchor it falls with probability 0.0006 per step. Without this, every tunnel caves in at once. Undercut overhangs crumble slowly by design.
- Sand `data` is moisture (0–255). Water next to sand soaks in; moisture spreads to drier neighbours; only sand with open air above it dries out.
- `top[x]` is the first sand/stone cell in each column, recomputed every step. Empty cells below it draw as tunnel, above it as sky. Ants use it to know they are "above ground".
- Ants are objects in `ants[]`, not cells. They can only stand in empty or water cells and only move to cells touching something solid (the glass is too slick to climb). Each ant has a preferred dig direction (`ddx`, `ddy`) chosen at birth, which is what makes tunnels branch outward and down.
- Ant priorities: carrying sand → go up, drop it above ground. Carrying food → go to the queen. Otherwise → pick up adjacent food, else head for the nearest crumb within 75 cells (`foodList`, rebuilt every 15 steps), else dig.
- Ants carrying food or chasing a target delete a blocking sand cell when stuck. This loses a little sand over time (about 400 of 17,000 cells in 11,000 steps). Accepted.
- The queen is a 3 × 2 agent. Sand that lands on her footprint is cleared. She falls if nothing is under her.

## 6. What changed and why

- **2026-11-21, v1.** First build and publish. After the first look, tunnels were made lighter (ants were invisible on dark tunnels), digging rate raised from 0.05 to 0.14 per eligible step, and drying limited to exposed sand (all moisture was evaporating evenly).
- **2026-11-21, repo.** `serve.js` moved from the session scratchpad into the project, and `.claude/launch.json` now points at it by relative path. First commit pushed to GitHub.

## 7. Traps already paid for

- A plain falling-sand rule collapses every tunnel. See the packed sand rule above before changing `updSand`.
- `file://` preview fails in the app's browser pane; serve over localhost instead.
- The preview server's port must come from `PORT`; a hardcoded port collided with something already on 5178.
- The preview server first lived in the session's temporary scratchpad, so `launch.json` pointed at a path that could disappear. Keep `serve.js` in the repo and reference it relatively.
- Stats only refresh inside the `requestAnimationFrame` loop. Calling `step()` from the console does not update the numbers on screen until a frame renders.

## 8. How things are verified

Measured in the app's browser pane on 2026-11-21:

- Step cost: 0.25 ms per simulation step (200 steps averaged), so 4× speed is far inside the frame budget.
- Colony loop: from the starting farm, 10,900 steps took the queen from 0 to 59 crumbs and the colony from 16 to a peak of 43 workers. All 70 starting crumbs were eaten.
- Water: 205 cells of poured water fully soaked into the sand within 3,000 steps.
- Phone width (375 px): page scroll width equals viewport width, no sideways scroll; canvas 319 px wide.
- No console errors.

Not verified: real touch input on a phone, and the dark/light switch through the artifact viewer's own theme toggle.

## 9. Outstanding

- Move the working copy to a permanent folder. The code is safe on GitHub, but the local folder is a temporary one the Claude app made for the first session and is deleted with it.
- Qoder: `local_folder` stays empty until that move.
- Ideas, not commitments: pheromone trails, a day/night cycle, ants that die leaving remains, saving a farm.

## 10. Code conventions

- One IIFE, `"use strict"`, no globals except the `window.__underfoot` debug handle.
- Colours for the page are CSS tokens on `:root`, redefined for dark mode in both the media query and `[data-theme="dark"]`. Colours inside the farm are computed in `render()`; the sky follows the page theme through `readTheme()`.
- Probabilities are tuned per step at 60 steps a second. Changing the step rate changes the feel of everything.
