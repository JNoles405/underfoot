// Builds the static site Vercel serves: dist/index.html is underfoot.html in the artifact's skeleton.
// Usage: node tools/build-site.js   (run by Vercel through vercel.json)
const fs = require("fs"), path = require("path"), wrap = require("./wrap");
const root = path.join(__dirname, ".."), out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), wrap(fs.readFileSync(path.join(root, "underfoot.html"), "utf8")));
console.log("wrote dist/index.html");
