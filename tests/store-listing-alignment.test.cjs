"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Store review brief describes the current live 180-day shop game", () => {
  const brief = fs.readFileSync(path.join(__dirname, "../store/PRODUCT_BRIEF_JA.md"), "utf8");
  assert.match(brief, /180日/);
  assert.match(brief, /10:00〜19:00/);
  assert.match(brief, /15分/);
  for (const tab of ["店舗", "買取", "在庫", "修理", "営業", "資金", "記録"]) {
    assert.match(brief, new RegExp(tab));
  }
  assert.match(brief, /3つの融資モード/);
  assert.match(brief, /30日ごとの月次/);
});
