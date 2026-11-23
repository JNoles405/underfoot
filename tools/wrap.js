// The minimal page skeleton the Artifact publisher adds around underfoot.html, which deliberately has no
// <!doctype>, <head> or <body> of its own. Shared by serve.js (local preview) and build-site.js (Vercel),
// so both serve the page the way the artifact does.
module.exports = body => '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + body + "</body></html>";
