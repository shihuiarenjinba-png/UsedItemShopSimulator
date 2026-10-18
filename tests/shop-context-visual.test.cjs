"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8"),css=fs.readFileSync("shop-context.css","utf8"),
 tabs=fs.readFileSync("src/shop-tabs.js","utf8"),scenes=fs.readFileSync("src/shop-context.js","utf8");
test("shop loads free scenery after actual operational tab controller",()=>{
 assert.ok(html.includes('src/shop-context.js'));assert.ok(html.includes('shop-context.css'));
 assert.ok(html.indexOf('src/shop-tabs.js')<html.indexOf('src/shop-context.js'));
 assert.match(tabs,/document\.body\.dataset\.shopSeller=String\(sellerWaiting\)/);
 assert.match(css,/shop-map\[data-arrival="waiting"\] \.scene-person\{display:none!important\}/);
 assert.match(css,/body\[data-shop-seller="true"\] \.shop-context\[data-scene="buy"\] \.shop-context-figure\{display:block\}/);
 assert.doesNotMatch(scenes,/localStorage|XMLHttpRequest|\bfetch\s*\(/);
 assert.doesNotThrow(()=>new vm.Script(scenes));
});
test("warehouse and repairs never display customer figure; home remains scene specific",()=>{
 for(const kind of ["stock","repair","money","records","day"])
  assert.match(css,new RegExp('shop-context\\[data-scene="'+kind+'"\\] \\.shop-context-figure'));
 for(const id of ["warehouseStage","inventoryStage","workshopStage","openDayStage","financeStage","recordsStage"])
  assert.match(html,new RegExp('id="'+id+'"'));
});
