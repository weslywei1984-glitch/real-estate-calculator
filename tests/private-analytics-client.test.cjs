const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const publicPages = [
  "index.html",
  "land-increment-total.html",
  "tainan-land-value-helper.html"
];
const markerPattern = /\/\* Private anonymous analytics client: start \*\/([\s\S]*?)\/\* Private anonymous analytics client: end \*\//;

function readPage(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

function analyticsBlock(html) {
  const match = html.match(markerPattern);
  assert.ok(match, "missing marked private analytics client");
  return match[0];
}

function clientFixture({ visibilityState = "visible", referrer = "", innerWidth = 1024, beaconResult = true } = {}) {
  const listeners = {};
  const sent = [];
  const stored = new Map();
  const document = {
    visibilityState,
    referrer,
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };
  const context = {
    Blob: class Blob {
      constructor(parts, options) {
        this.text = parts.join("");
        this.type = options.type;
      }
    },
    URL,
    crypto: { randomUUID: () => "f1980a88-54b8-4f83-9a70-9196a74696d9" },
    document,
    fetch: (...args) => {
      sent.push({ transport: "fetch", args });
      return Promise.resolve();
    },
    localStorage: {
      getItem: key => stored.get(key) || null,
      setItem: (key, value) => stored.set(key, value)
    },
    location: { hostname: "calc.tainanwei.com" },
    navigator: {
      sendBeacon: (url, body) => {
        sent.push({ transport: "beacon", url, body });
        return beaconResult;
      }
    },
    window: { innerWidth }
  };
  return { context, document, listeners, sent, stored };
}

test("all public pages share the byte-identical private analytics client without public counters", () => {
  const pages = publicPages.map(readPage);
  const blocks = pages.map(analyticsBlock);
  assert.deepEqual(blocks, [blocks[0], blocks[0], blocks[0]]);

  for (const html of pages) {
    const block = analyticsBlock(html);
    assert.match(html, /realEstateAnalyticsVisitor\.v1/);
    assert.match(html, /crypto\.randomUUID\(\)/);
    assert.match(html, /document\.visibilityState/);
    assert.match(html, /visibilitychange/);
    assert.match(html, /navigator\.sendBeacon\(/);
    assert.match(html, /fetch\(/);
    assert.match(html, /keepalive:\s*true/);
    assert.match(html, /\/api\/analytics\/event/);
    assert.doesNotMatch(html, /analytics[^\n>]*(?:counter|total|count)[^\n>]*[=>]/i);
    assert.doesNotMatch(block, /(?:alert\(|console\.error\(|setTimeout\()/);
  }
});

test("visit waits for visibility, is once-only, and records anonymous normalized dimensions", () => {
  const html = readPage("index.html");
  const fixture = clientFixture({ visibilityState: "hidden", referrer: "https://www.Google.com/search", innerWidth: 768 });
  vm.runInNewContext(`${analyticsBlock(html)}\nthis.client = { privateAnalyticsDeviceType, privateAnalyticsReferrerDomain, setupPrivateAnalyticsVisit };`, fixture.context);

  assert.equal(fixture.context.client.privateAnalyticsDeviceType(), "mobile");
  assert.equal(fixture.context.client.privateAnalyticsReferrerDomain(), "google.com");
  fixture.context.client.setupPrivateAnalyticsVisit();
  assert.equal(fixture.sent.length, 0);
  fixture.document.visibilityState = "visible";
  fixture.listeners.visibilitychange();
  fixture.listeners.visibilitychange();
  assert.equal(fixture.sent.length, 1);
  assert.equal(fixture.stored.get("realEstateAnalyticsVisitor.v1"), "f1980a88-54b8-4f83-9a70-9196a74696d9");
  assert.deepEqual(JSON.parse(fixture.sent[0].body.text), {
    type: "visit",
    visitorId: "f1980a88-54b8-4f83-9a70-9196a74696d9",
    deviceType: "mobile",
    referrerDomain: "google.com"
  });
});

test("completion omits the visitor ID and falls back once to keepalive fetch", () => {
  const html = readPage("index.html");
  const fixture = clientFixture({ visibilityState: "hidden", beaconResult: false });
  vm.runInNewContext(`${analyticsBlock(html)}\nthis.client = { sendPrivateAnalyticsEvent };`, fixture.context);
  fixture.context.client.sendPrivateAnalyticsEvent("completion", "loan");

  assert.equal(fixture.sent.length, 2);
  assert.equal(fixture.sent[0].transport, "beacon");
  assert.equal(fixture.sent[1].transport, "fetch");
  assert.equal(fixture.sent[1].args[0], "/api/analytics/event");
  const request = fixture.sent[1].args[1];
  assert.equal(request.method, "POST");
  assert.equal(request.credentials, "same-origin");
  assert.equal(request.headers["Content-Type"], "application/json");
  assert.equal(request.body, JSON.stringify({
    type: "completion",
    calculator: "loan",
    deviceType: "desktop",
    referrerDomain: "direct"
  }));
  assert.equal(request.keepalive, true);
});

test("referrer classification distinguishes direct, internal, external, and desktop", () => {
  const html = readPage("index.html");
  for (const [referrer, expected] of [
    ["", "direct"],
    ["https://calc.tainanwei.com/land-increment-total.html", "internal"],
    ["https://WWW.Example.COM/path", "example.com"]
  ]) {
    const fixture = clientFixture({ referrer, innerWidth: 769 });
    vm.runInNewContext(`${analyticsBlock(html)}\nthis.client = { privateAnalyticsDeviceType, privateAnalyticsReferrerDomain };`, fixture.context);
    assert.equal(fixture.context.client.privateAnalyticsReferrerDomain(), expected);
    assert.equal(fixture.context.client.privateAnalyticsDeviceType(), "desktop");
  }
});

test("each calculator records one completion only when rapid next clicks enter its result", () => {
  const html = readPage("index.html");
  const setupSource = html.match(
    /function setupWizards\(\) \{[\s\S]*?\r?\n    \}(?=\r?\n\r?\n    setupNumericInputs\(\);)/
  )?.[0];
  assert.ok(setupSource, "missing setupWizards");

  for (const calculator of ["tax", "buyer", "loan", "young"]) {
    const listeners = {};
    const nextButton = { addEventListener: (type, handler) => { listeners[type] = handler; } };
    const workspace = {
      dataset: { wizard: calculator, wizardCurrent: "2" },
      querySelector: selector => selector === "[data-wizard-next]" ? nextButton : null
    };
    const sentEvents = [];
    const context = {
      document: { querySelectorAll: () => [workspace] },
      validateWizardStep: () => true,
      wizardSteps: () => ["1", "2", "3", "4"],
      setWizardStep: (target, index) => { target.dataset.wizardCurrent = String(index); },
      resetWizard: () => {},
      runGroup: () => {},
      sendPrivateAnalyticsEvent: (type, calculatorName) => sentEvents.push({ type, calculator: calculatorName })
    };
    vm.runInNewContext(`${setupSource}\nsetupWizards();`, context);
    listeners.click();
    listeners.click();
    assert.deepEqual(sentEvents, [{ type: "completion", calculator }]);
  }
});

test("recalculation paths do not emit analytics completions", () => {
  const html = readPage("index.html");
  const prohibited = ["function runGroup", "function scheduleGroup", "function restoreInputs", "function resetWizard", "function activateTab"];
  for (const start of prohibited) {
    const source = html.slice(html.indexOf(start), html.indexOf("\n    }", html.indexOf(start)) + 7);
    assert.doesNotMatch(source, /sendPrivateAnalyticsEvent\(/, `${start} must not send analytics`);
  }
});
