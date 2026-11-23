// Seeded colony runs: the same seed builds the same farm and plays out the same, so a bad run can be
// replayed and compared across builds. Math.random in the page's sandbox is replaced by a seeded generator,
// and the warm-up always runs all 900 steps. Prints, per seed: fed, the first step any ant was above ground
// (firstOut, -1 = never) and the first step any ant picked up a crumb (firstPick), plus a snapshot.
// Usage: node tools/seed-runs.js underfoot.html <seeds> <steps> [seed to trace every 250 steps]
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const SEEDS = +process.argv[3], STEPS = +process.argv[4];
let src = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
src = src.replace("count: t =>", "dbg: () => ({ type, top, ground, holes, W, H, foodList }), count: t =>");
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function make(seed) {
  const els = {};
  const ctx = new Proxy({}, { get: (t, k) => k === "createImageData" ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : k in t ? t[k] : () => {}, set: (t, k, v) => (t[k] = v, true) });
  const el = id => els[id] || (els[id] = { attrs: {}, style: {}, handlers: {}, children: [], value: "4", clientWidth: 800, textContent: "", setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { (this.handlers[t] ||= []).push(f); }, appendChild(c) { this.children.push(c); }, getContext: () => ctx });
  let n = 0;
  const M = Object.create(Math); M.random = mulberry(seed);
  const perf = { now: () => 0 }; // warm-up always runs all 900 steps
  const sb = { document: { getElementById: el, createElement: () => el("a" + n++), documentElement: { getAttribute: () => null } }, matchMedia: () => ({ matches: false, addEventListener() {} }), MutationObserver: class { observe() {} }, HTMLInputElement: class {}, addEventListener() {}, requestAnimationFrame() {}, performance: perf, Math: M, devicePixelRatio: 1 };
  sb.window = sb; vm.createContext(sb); vm.runInContext(src, sb); return sb.__underfoot;
}
const verbose = process.argv[5];
for (let s = 1; s <= SEEDS; s++) {
  if (verbose && +verbose !== s) continue;
  const u = make(s);
  let firstOut = -1, firstPick = -1, log = [];
  const snap = k => {
    const d = u.dbg(), L = u.list();
    const above = L.filter(a => a.y < d.ground[a.x]).length;
    const food = L.filter(a => a.carry === 4), fa = food.filter(a => a.y < d.ground[a.x]);
    return `k${k} ants ${L.length} above ${above} food-carriers ${food.length} (above ${fa.length}) sand-carriers ${L.filter(a => a.carry === 1).length} fed ${u.queen().fed} holes [${d.holes.join(",")}] q ${u.queen().x},${u.queen().y} ` +
      (food.length ? "fc:" + food.slice(0, 6).map(a => `${a.x},${a.y}/g${d.ground[a.x]}/ex${a.ex}/st${a.stuck}`).join(" ") : "");
  };
  for (let k = 1; k <= STEPS; k++) {
    u.step();
    const d = u.dbg(), L = u.list();
    if (firstOut < 0 && L.some(a => a.y < d.ground[a.x])) firstOut = k;
    if (firstPick < 0 && L.some(a => a.carry === 4)) firstPick = k;
    if (verbose && k % 250 === 0) log.push(snap(k));
  }
  const q = u.queen();
  console.log(`seed ${s}: fed ${q.fed} firstOut ${firstOut} firstPick ${firstPick} ants ${u.ants} | ${snap(STEPS)}`);
  if (verbose) console.log(log.join("\n"));
}
