const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const publicPages = [
  "index.html",
  "land-increment-total.html",
  "tainan-land-value-helper.html",
];

test("公開頁面不載入 LINE LIFF 好友鎖", () => {
  for (const file of publicPages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(html, /static\.line-scdn\.net\/liff/i, file);
    assert.doesNotMatch(html, /assets\/liff-gate\.js/i, file);
  }
});

test("主頁保留 LINE 詢問入口", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /https:\/\/line\.me\/R\/ti\/p\/@tainanwei/);
});

test("主頁土地工具連結留在目前部署網域", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

  assert.ok(hrefs.includes("tainan-land-value-helper.html"));
  assert.ok(hrefs.includes("land-increment-total.html"));
  assert.equal(
    hrefs.some((href) =>
      /github\.io\/real-estate-calculator\/(?:tainan-land-value-helper|land-increment-total)\.html/i.test(href),
    ),
    false,
  );
});
