// Headless colony test: runs the page's script in Node with the DOM stubbed out, from the
// starting farm, and reports how many runs stalled (queen fed < 20 crumbs) and the mean fed.
// Usage: node tools/colony-test.js underfoot.html <runs> <steps> [trails on|off] [cycle on|off] [speed 1|real]
// Runs vary a lot; use 40 runs of 8000 steps before trusting a difference.
// Also prints the ants' mean walking speed in cells per step (path length, pauses included).
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const RUNS = +process.argv[3], STEPS = +process.argv[4], trails = process.argv[5], cycle = process.argv[6], speed = process.argv[7];
const src = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
function make() {
  const els = {};
  // any canvas method is a no-op except createImageData
  const ctx = new Proxy({}, { get: (t, k) => k === "createImageData" ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : k in t ? t[k] : () => {}, set: (t, k, v) => (t[k] = v, true) });
  const el = id => els[id] || (els[id] = { attrs: {}, style: {}, handlers: {}, children: [], value: "4", clientWidth: 800, textContent: "", setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { (this.handlers[t] ||= []).push(f); }, appendChild(c) { this.children.push(c); }, getContext: () => ctx });
  let n = 0;
  const sb = { document: { getElementById: el, createElement: () => el("a" + n++), documentElement: { getAttribute: () => null } }, matchMedia: () => ({ matches: false, addEventListener() {} }), MutationObserver: class { observe() {} }, HTMLInputElement: class {}, addEventListener() {}, requestAnimationFrame() {}, performance, Math, devicePixelRatio: 1 };
  sb.window = sb; vm.createContext(sb); vm.runInContext(src, sb); return sb.__underfoot;
}
const fed = [], peak = []; let sand0 = 0, sand1 = 0, dist = 0, moves = 0;
for (let r = 0; r < RUNS; r++) {
  const u = make();
  if (u.setTrails && trails) u.setTrails(trails === "on");
  if (u.setCycle && cycle) u.setCycle(cycle === "on");
  if (u.setSpeed && speed) u.setSpeed(speed === "real" ? "real" : +speed);
  let p = 0; sand0 += u.count(1);
  for (let k = 1; k <= STEPS; k++) {
    const pos = k <= 3000 ? u.list().map(a => [a, a.x, a.y]) : null;
    u.step();
    if (pos) for (const [a, x, y] of pos) { const d = Math.hypot(a.x - x, a.y - y); if (d <= 1.5) { dist += d; moves++; } }
    if (k % 500 === 0) p = Math.max(p, u.ants);
  }
  fed.push(u.queen().fed); peak.push(p); sand1 += u.count(1);
}
const mean = a => (a.reduce((n, v) => n + v, 0) / a.length).toFixed(1);
console.log(`trails ${trails || "-"}, cycle ${cycle || "-"}, speed ${speed || "-"}: runs ${RUNS}, steps ${STEPS}, stalled(<20 fed) ${fed.filter(f => f < 20).length}, mean fed ${mean(fed)}, mean peak workers ${mean(peak)}, sand lost per run ${((sand0 - sand1) / RUNS).toFixed(0)}, walk ${(dist / moves).toFixed(3)} cells/step (first 3000 steps)`);
console.log("  fed:", fed.join(" "));
