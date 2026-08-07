const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dashboardPath = path.join(__dirname, "..", "analytics", "index.html");
const dashboard = fs.readFileSync(dashboardPath, "utf8");

test("私人分析後台保留中文語意與不蒐集輸入資料的說明", () => {
  assert.match(dashboard, /<html[^>]+lang=["']zh-Hant["']/i);
  assert.match(dashboard, /<title>[^<]*(?:私人分析|私有分析|分析後台)[^<]*<\/title>/);
  assert.match(dashboard, /不包含使用者輸入或試算結果/);
});

test("私人分析頁面不嵌入外部資產或帳密與資料管理控制", () => {
  assert.doesNotMatch(dashboard, /<(?:script|link|iframe)\b[^>]+(?:https?:\/\/|\/\/)/i);
  assert.doesNotMatch(dashboard, /<(?:form|iframe)\b/i);
  assert.doesNotMatch(dashboard, /type=["']password["']/i);
  assert.doesNotMatch(dashboard, /\b(?:reset|delete|export|public\s+counter)\b/i);
  assert.doesNotMatch(dashboard, /(?:google-analytics|gtag|segment|mixpanel|cdn)/i);
});

test("統計期間按鈕與資料容器具有穩定識別", () => {
  for (const range of ["today", "7d", "30d", "all"]) {
    assert.match(dashboard, new RegExp(`data-range=["']${range}["']`));
  }
  for (const id of [
    "totalVisits", "totalCompletions", "completionsPer100", "calculatorBreakdown",
    "trendChart", "deviceBreakdown", "referrerTable", "hourlyChart",
    "analyticsUpdatedAt", "analyticsError", "analyticsRetry",
  ]) {
    assert.match(dashboard, new RegExp(`id=["']${id}["']`), id);
  }
});

test("統計摘要以同源且不快取的請求載入", () => {
  assert.match(dashboard, /\/api\/analytics\/summary\?range=/);
  assert.match(dashboard, /credentials:\s*["']same-origin["']/);
  assert.match(dashboard, /cache:\s*["']no-store["']/);
  assert.match(dashboard, /encodeURIComponent\(range\)/);
});

test("載入、空白、成功與錯誤狀態皆為可呈現狀態", () => {
  assert.match(dashboard, /data-state=["']loading["']/);
  for (const state of ["empty", "success", "error"]) {
    assert.match(dashboard, new RegExp(`setState\\([\\s\\S]*?["']${state}["']`), state);
  }
  assert.match(dashboard, /資料暫時無法載入，請稍後再試。/);
});

test("版面在小螢幕保持可近用的帳本式數字節奏", () => {
  assert.match(dashboard, /max-width\s*:/);
  assert.match(dashboard, /@media\s*\([^)]*max-width\s*:\s*(?:[0-6]\d\d|700)px/i);
  assert.match(dashboard, /:focus-visible/);
  assert.match(dashboard, /font-variant-numeric\s*:\s*tabular-nums/);
  assert.match(dashboard, /prefers-reduced-motion\s*:\s*reduce/);
});

test("趨勢圖是帶有替代文字的雙序列 SVG，不依賴圖表套件", () => {
  assert.match(dashboard, /<svg[^>]+id=["']trendChart["']/);
  assert.match(dashboard, /<title[^>]*>[^<]*<\/title>/);
  assert.match(dashboard, /<desc[^>]*>[^<]*<\/desc>/);
  assert.match(dashboard, /(?:趨勢圖例|trend-legend)/);
  assert.doesNotMatch(dashboard, /(?:chart\.js|highcharts|d3\.js|echarts|apexcharts)/i);
});

test("渲染契約涵蓋本地格式、四項工具、來源表與二十四小時資料", () => {
  assert.match(dashboard, /Intl\.NumberFormat\(["']zh-TW["']/);
  assert.match(dashboard, /completionsPer100Visits[^\n]*["']—["']/);
  for (const calculator of ["tax", "buyer", "loan", "young"]) {
    assert.match(dashboard, new RegExp(`["']${calculator}["']`));
  }
  assert.match(dashboard, /直接開啟/);
  assert.match(dashboard, /站內移動/);
  assert.match(dashboard, /Array\.from\(\{\s*length:\s*24\s*\}/);
  assert.match(dashboard, /Asia\/Taipei/);
});
