// Headless colony test: runs the page's script in Node with the DOM stubbed out, from the
// starting farm, and reports how many runs stalled (queen fed < 20 crumbs) and the mean fed.
// Usage: node tools/colony-test.js underfoot.html <runs> <steps> [on|off]   (on/off = pheromone trails)
// Runs vary a lot; use 40 runs of 8000 steps before trusting a difference.
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const RUNS = +process.argv[3], STEPS = +process.argv[4], mode = process.argv[5];
const src = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
function make() {
  const els = {};
  const el = id => els[id] || (els[id] = { attrs: {}, handlers: {}, children: [], value: "4", setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { (this.handlers[t] ||= []).push(f); }, appendChild(c) { this.children.push(c); }, getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }) });
  let n = 0;
  const sb = { document: { getElementById: el, createElement: () => el("a" + n++), documentElement: { getAttribute: () => null } }, matchMedia: () => ({ matches: false, addEventListener() {} }), MutationObserver: class { observe() {} }, HTMLInputElement: class {}, addEventListener() {}, requestAnimationFrame() {}, performance, Math };
  sb.window = sb; vm.createContext(sb); vm.runInContext(src, sb); return sb.__underfoot;
}
const fed = [], peak = []; let sand0 = 0, sand1 = 0;
for (let r = 0; r < RUNS; r++) {
  const u = make(); if (u.setTrails && mode) u.setTrails(mode === "on");
  let p = 0; sand0 += u.count(1);
  for (let k = 1; k <= STEPS; k++) { u.step(); if (k % 500 === 0) p = Math.max(p, u.ants); }
  fed.push(u.queen().fed); peak.push(p); sand1 += u.count(1);
}
const mean = a => (a.reduce((n, v) => n + v, 0) / a.length).toFixed(1);
console.log(`${mode || "v1"}: runs ${RUNS}, steps ${STEPS}, stalled(<20 fed) ${fed.filter(f => f < 20).length}, mean fed ${mean(fed)}, mean peak workers ${mean(peak)}, sand lost per run ${((sand0 - sand1) / RUNS).toFixed(0)}`);
console.log("  fed:", fed.join(" "));
