const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const indexHtml = read("index.html");
const landValueHtml = read("tainan-land-value-helper.html");
const landIncrementHtml = read("land-increment-total.html");

for (const [name, html] of [
  ["公告土地現值", landValueHtml],
  ["土地漲多少", landIncrementHtml]
]) {
  test(`${name}使用4合1核定主視覺與品牌色`, () => {
    assert.match(
      html,
      /class="brand-hero__mobile-art"[^>]*src="assets\/mobile-hero-exact\.jpg"[^>]*width="1787"[^>]*height="880"/
    );
    const marker = html.lastIndexOf("/* Consultant B shared tool theme */");
    assert.ok(marker > -1);
    const css = html.slice(marker, html.indexOf("</style>", marker));
    assert.match(css, /--consultant-cream:\s*#f3ead7/);
    assert.match(css, /--consultant-navy:\s*#102738/);
    assert.match(css, /--consultant-terracotta:\s*#b9502d/);
    assert.match(css, /\.brand-hero__mobile-art\s*\{[^}]*width:\s*100%[^}]*height:\s*auto/s);
    assert.match(css, /@media \(max-width:\s*620px\)/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  });
}

