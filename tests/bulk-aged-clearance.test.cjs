"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8"),app=fs.readFileSync("src/app.js","utf8");
test("a clearance preview requires the existing explicit save-protected confirmation",()=>{
 assert.match(html,/id="agedDiscountBtn"/);assert.match(html,/id="agedDiscountPct"/);
 assert.match(app,/const stagedStockPrices=new Map\(\)/);
 assert.match(app,/if\(actualIds\.has\(id\)\)prices\.push\(\{id,price\}\)/);
 assert.match(app,/commitLive\(L\.configure\(state,ensureLive\(\),requested\)\)/);
 assert.match(app,/resetStockDraft\(\);refresh\(\)/);
 assert.match(app,/warehousePage\+\+;renderInventory\(\)/);
 assert.match(app,/dataset\.basePrice=String\(p\.price\)/);
});
test("bulk action stages all matching inventory including products on hidden warehouse pages",()=>{
 const start=app.indexOf("function applyAgedDiscount(){"),end=app.indexOf(" function plan(){",start);
 assert.ok(start>=0&&end>start,"bulk-action boundaries should remain distinct");
 const items=[
  {id:101,ageDays:8,grade:"A",zone:"warehouse",price:1000},
  {id:102,ageDays:1,grade:"C",zone:"shelf",price:700},
  {id:103,ageDays:1,grade:"A",zone:"warehouse",price:800},
  {id:104,ageDays:12,grade:"C",zone:"workshop",price:600},
  {id:105,ageDays:21,grade:"B",zone:"warehouse",price:2100}
 ];
 // Only one price input is currently visible; two eligible goods are off-page.
 const visible=[{dataset:{stockPrice:"102"},value:"700"}],staged=new Map();
 const notice={textContent:""},pct={value:"20"},inventory={replaceChildren(){}};
 const $=id=>id==="agedDiscountPct"?pct:id==="agedDiscountNotice"?notice:id==="inventory"?inventory:null;
 let refreshed=0,rendered=0;
 const remember=()=>{for(const el of visible)staged.set(Number(el.dataset.stockPrice),Number(el.value));};
 const action=new Function("stagedStockPrices","storeItems","rememberVisibleStockPrices","$",
    "renderInventory","refreshBudget","recoveryBlocked","onboardingRequired","state",
    app.slice(start,end)+"return applyAgedDiscount;")
  (staged,()=>items,remember,$,()=>{rendered++;visible[0].value=String(staged.get(102));},
   ()=>refreshed++,false,false,{pendingMonth:false});
 action();
 assert.deepEqual([...staged].sort((a,b)=>a[0]-b[0]),[[101,800],[102,560],[105,1680]]);
 assert.equal(visible[0].value,"560");
 assert.match(notice.textContent,/全在庫から3点を20％引き/);
 assert.equal(rendered,1);assert.equal(refreshed,1);
 // Restarting the same clearance percentage does not accumulate discounts.
 action();assert.equal(staged.get(101),800);
 pct.value="50";action();
 assert.equal(staged.get(101),500);
 assert.equal(staged.get(102),350);
 assert.equal(staged.get(105),1050);
 assert.equal(staged.has(103),false);assert.equal(staged.has(104),false);
});
test("bad stock price input is preserved for actual engine validation, not silently omitted",()=>{
 assert.match(app,/if\(Number\.isSafeInteger\(id\)\)stagedStockPrices\.set\(id,value\)/);
 assert.match(app,/for\(const \[id,price\] of stagedStockPrices\)if\(actualIds\.has\(id\)\)prices\.push/);
});
