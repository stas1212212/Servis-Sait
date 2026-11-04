"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../server/public/css/cabinet-repairs.css"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../server/public/cabinet.html"), "utf8");

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(x => Number.parseInt(x, 16) / 255);
  const linear = channels.map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function ratio(background,foreground) {
  const values = [luminance(background),luminance(foreground)].sort((a,b) => b-a);
  return (values[0]+0.05)/(values[1]+0.05);
}
test("repair history CSS is linked from cabinet head", () => {
  const head = html.split("</head>")[0];
  assert.match(head, /href="\/css\/cabinet-repairs\.css\?v=20261104"/);
  assert.equal((html.match(/cabinet-repairs\.css/g)||[]).length,1);
});
test("dark repair cards have an explicit dark surface and readable foreground", () => {
  assert.match(css, /html\.dark \.repair-history-item\s*\{[^}]*background:\s*#243248\s*!important/s);
  assert.match(css, /html\.dark \.repair-history-item p\s*\{[^}]*color:\s*#d5e0f0\s*!important/s);
  assert.match(css, /html\.dark \.repair-history-item \.repair-history-top span\s*\{[^}]*background:\s*#1e436e\s*!important/s);
  assert.match(css, /html\.dark \.repair-history-item a\s*\{[^}]*color:\s*#93c5fd\s*!important/s);
  assert.ok(ratio("#243248","#d5e0f0") >= 4.5);
  assert.ok(ratio("#1e436e","#bfdbfe") >= 4.5);
});
test("light repair cards retain accessible foreground and badge contrast", () => {
  assert.match(css, /\.repair-history-item\s*\{[^}]*background:\s*#f8fafc/s);
  assert.match(css, /\.repair-history-item p\s*\{[^}]*color:\s*#334155/s);
  assert.ok(ratio("#f8fafc","#334155") >= 4.5);
  assert.ok(ratio("#dbeafe","#1d4ed8") >= 4.5);
});
