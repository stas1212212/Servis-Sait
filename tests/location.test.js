"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const pub = path.join(__dirname, "../server/public");
const locationSource = fs.readFileSync(path.join(pub, "js/location.js"), "utf8");

function fakeWidget() {
  const cells = new Map([
    ["[data-location-address]", { textContent: "" }],
    ["[data-location-hours]", { textContent: "" }],
    ["[data-location-phone]", { textContent: "" }],
    ["[data-location-directions]", { hidden: true, href: "", rel: "", target: "" }],
    ["[data-location-map]", { nodes: [], replaceChildren(...nodes) { this.nodes = nodes; } }]
  ]);
  return { querySelector: key => cells.get(key), cells };
}
async function renderWithSettings(settings, networkError = false) {
  const widget = fakeWidget();
  let onLoad;
  const createElement = name => ({
    tagName: name.toLowerCase(), attributes: {}, children: [],
    setAttribute(key, value) { this.attributes[key] = value; },
    append(...nodes) { this.children.push(...nodes); },
    className: "", textContent: ""
  });
  const doc = {
    readyState: "loading",
    querySelectorAll: () => [widget],
    addEventListener(type, callback) { if (type === "DOMContentLoaded") onLoad = callback; },
    createElement
  };
  let requests = 0;
  vm.runInNewContext(locationSource, {
    document: doc,
    URL,
    fetch: async () => {
      requests++;
      if (networkError) throw Error("offline");
      return { ok: true, json: async () => ({ settings }) };
    },
    console: { warn() {} }
  });
  await onLoad();
  return { widget, requests };
}

test("location widgets are attached to home, shop, contacts", () => {
  for (const name of ["index.html", "pults-shop.html", "contacts.html"]) {
    const html = fs.readFileSync(path.join(pub, name), "utf8");
    assert.ok(html.includes('data-location-widget'), name);
    assert.ok(html.includes('/css/location.css'), name);
    assert.ok(html.includes('/js/location.js'), name);
  }
});

test("missing address does not load Google or offer a made-up route", async () => {
  const { widget, requests } = await renderWithSettings({ address: "", phone: "", business_hours: "" });
  assert.equal(requests, 1);
  assert.equal(widget.cells.get("[data-location-map]").nodes[0].tagName, "div");
  assert.equal(widget.cells.get("[data-location-directions]").hidden, true);
  assert.equal(widget.cells.get("[data-location-address]").textContent, "Адреса уточнюється");
});

test("configured address is encoded in the Google Maps embed and directions", async () => {
  const address = "Україна, Київ, вул. Прикладна, 10/2";
  const { widget } = await renderWithSettings({
    address, phone: "+380 00 000 00 00", business_hours: "Пн–Пт 09:00–18:00"
  });
  const iframe = widget.cells.get("[data-location-map]").nodes[0];
  assert.equal(iframe.tagName, "iframe");
  assert.equal(iframe.loading, "lazy");
  const embedded = new URL(iframe.src);
  assert.equal(embedded.origin, "https://www.google.com");
  assert.equal(embedded.searchParams.get("q"), address);
  assert.equal(embedded.searchParams.get("output"), "embed");
  const link = widget.cells.get("[data-location-directions]");
  assert.equal(link.hidden, false);
  const directions = new URL(link.href);
  assert.equal(directions.searchParams.get("destination"), address);
  assert.equal(directions.searchParams.get("api"), "1");
  assert.equal(link.rel, "noopener noreferrer");
  assert.equal(widget.cells.get("[data-location-hours]").textContent, "Пн–Пт 09:00–18:00");
});

test("temporary settings outage leaves a usable page without map iframe", async () => {
  const { widget } = await renderWithSettings(null, true);
  assert.equal(widget.cells.get("[data-location-directions]").hidden, true);
  assert.equal(widget.cells.get("[data-location-map]").nodes[0].tagName, "div");
});
