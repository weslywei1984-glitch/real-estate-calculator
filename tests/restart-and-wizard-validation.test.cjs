const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("result restart restores safe defaults instead of clearing every input", () => {
  for (const group of ["tax", "buyer", "loan", "young"]) {
    assert.match(
      html,
      new RegExp(`<button class="primary"[^>]*data-restart="${group}"[^>]*>重新試算</button>`)
    );
  }

  assert.match(html, /function restartGroup\(group\)/);
  assert.match(html, /applyGroupDefaults\(group\)/);
  assert.match(html, /document\.querySelectorAll\("\[data-restart\]"\)/);
  assert.doesNotMatch(html, /data-clear="(?:tax|buyer|loan|young)">重新試算<\/button>/);
});

test("wizard blocks blank or non-numeric money fields before leaving the step", () => {
  assert.match(html, /const numeric = strictNumber\(field\)/);
  assert.match(html, /numeric === null \|\| Number\.isNaN\(numeric\)/);
  assert.match(html, /field\.setCustomValidity\("請輸入有效數字"\)/);
});

test("blur formatting preserves invalid input for strict wizard validation", () => {
  const strictSource = html.match(/function strictNumber\(input\) \{[\s\S]*?\n    \}/)?.[0];
  const formatSource = html.match(/function formatNumericInput\(input\) \{[\s\S]*?\n    \}/)?.[0];
  assert.ok(strictSource && formatSource, "missing numeric helpers");
  assert.match(formatSource, /strictNumber\(input\)/);
  assert.doesNotMatch(formatSource, /parseNumericValue\(input\.value\)/);

  const context = { number: { format: value => `formatted:${value}` } };
  vm.runInNewContext(`${strictSource}\n${formatSource}\nthis.formatNumericInput = formatNumericInput;`, context);

  for (const invalid of ["abc", "1..2", "12a"]) {
    const input = { value: invalid };
    context.formatNumericInput(input);
    assert.equal(input.value, invalid);
  }

  const valid = { value: "1500" };
  context.formatNumericInput(valid);
  assert.equal(valid.value, "formatted:1500");
});

test("restoring defaults also synchronizes both salary sliders", () => {
  assert.match(html, /window\.syncSalarySliders\?\.forEach\(sync => sync\(\)\)/);
  assert.match(html, /bindSalarySlider\("loanSalarySlider", "loanSalary", "loan"\)/);
  assert.match(html, /bindSalarySlider\("youngSalarySlider", "youngMonthlyIncome", "young"\)/);
});

test("opening the result step recalculates after restart", () => {
  const setupSource = html.match(
    /function setupWizards\(\) \{[\s\S]*?\r?\n    \}(?=\r?\n\r?\n    setupNumericInputs\(\);)/
  )?.[0];
  assert.ok(setupSource, "missing setupWizards");

  const listeners = {};
  const nextButton = {
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };
  const workspace = {
    dataset: { wizard: "loan", wizardCurrent: "2" },
    querySelector(selector) {
      return selector === "[data-wizard-next]" ? nextButton : null;
    }
  };
  const runs = [];
  const context = {
    document: { querySelectorAll: () => [workspace] },
    validateWizardStep: () => true,
    wizardSteps: () => ["1", "2", "3", "4"],
    setWizardStep: (target, index) => {
      target.dataset.wizardCurrent = String(index);
    },
    resetWizard: () => {},
    runGroup: (...args) => runs.push(args)
  };

  vm.runInNewContext(`${setupSource}\nsetupWizards();`, context);
  listeners.click();

  assert.equal(runs.length, 1);
  assert.equal(runs[0][0], "loan");
  assert.equal(runs[0][1].loading, true);
  assert.equal(runs[0][1].feedback, "已更新");
  assert.equal(workspace.dataset.wizardCurrent, "3");
});
