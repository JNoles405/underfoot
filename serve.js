// Local preview server for Underfoot.
// Serves the page wrapped in the same minimal skeleton the Artifact publisher adds,
// because underfoot.html deliberately has no <!doctype>, <head> or <body> of its own.
// Usage: node serve.js underfoot.html   (port from PORT, default 5291)
const http = require("http"), fs = require("fs"), path = require("path");
const file = path.resolve(process.argv[2] || path.join(__dirname, "underfoot.html"));
http.createServer((req, res) => {
  const body = fs.readFileSync(file, "utf8"); // re-read on every request, so a reload shows edits
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + body + "</body></html>");
}).listen(+process.env.PORT || 5291, () => console.log("listening on " + (+process.env.PORT || 5291)));
