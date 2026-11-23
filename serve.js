// Local preview server for Underfoot.
// Serves the page wrapped in the same minimal skeleton the Artifact publisher adds (tools/wrap.js),
// because underfoot.html deliberately has no <!doctype>, <head> or <body> of its own.
// Usage: node serve.js underfoot.html   (port from PORT, default 5291)
const http = require("http"), fs = require("fs"), path = require("path"), wrap = require("./tools/wrap");
const file = path.resolve(process.argv[2] || path.join(__dirname, "underfoot.html"));
http.createServer((req, res) => {
  const body = fs.readFileSync(file, "utf8"); // re-read on every request, so a reload shows edits
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(wrap(body));
}).listen(+process.env.PORT || 5291, () => console.log("listening on " + (+process.env.PORT || 5291)));
