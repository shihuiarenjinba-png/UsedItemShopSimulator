"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8"),app=fs.readFileSync("src/app.js","utf8");
test("aging-price panel is only a preview, with separate explicit confirmation",()=>{
 assert.match(html,/id="agedDiscountBtn"/);assert.match(html,/id="agedDiscountPct"/);
 assert.match(app,/dataset\.basePrice=String\(p\.price\)/);
 assert.match(app,/dataset\.ageDays=String\(p\.ageDays\?\?0\)/);
 assert.match(app,/agedDiscountBtn'\)\.addEventListener\('click',applyAgedDiscount\)/);
 assert.match(app,/applyPlan\(true\)/);
});
test("C-grade or older-than-7-days items discount; fresh items and workshop remain untouched",()=>{
 const start=app.indexOf("function applyAgedDiscount(){"),end=app.indexOf("function plan(){",start);
 assert.ok(start>=0&&end>start);
 const routine=app.slice(start,end);
 const rows=[
  {dataset:{ageDays:"8",grade:"A",zone:"warehouse",basePrice:"1000"},value:"1000"},
  {dataset:{ageDays:"1",grade:"C",zone:"shelf",basePrice:"700"},value:"700"},
  {dataset:{ageDays:"1",grade:"A",zone:"shelf",basePrice:"800"},value:"800"},
  {dataset:{ageDays:"12",grade:"D",zone:"workshop",basePrice:"600"},value:"600"}
 ];
 const notice={textContent:""},pct={value:"20"},dom={querySelectorAll:()=>rows};
 const $=id=>id==="agedDiscountPct"?pct:id==="agedDiscountNotice"?notice:null;
 let refreshed=0;
 const apply=new Function("document","$","refreshBudget","recoveryBlocked","onboardingRequired","state",
  routine+"return applyAgedDiscount;")(dom,$,()=>refreshed++,false,false,{pendingMonth:false});
 apply();
 assert.deepEqual(rows.map(x=>x.value),["800","560","800","600"]);
 assert.equal(refreshed,1);
 assert.match(notice.textContent,/2点を20％引き/);
 // Re-applying uses the saved base price rather than stacking another discount.
 apply();assert.equal(rows[0].value,"800");
 pct.value="50";apply();assert.deepEqual(rows.map(x=>x.value),["500","350","800","600"]);
});
