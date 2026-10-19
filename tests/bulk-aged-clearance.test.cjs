"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8"),app=fs.readFileSync("src/app.js","utf8");
test("bulk markdown previews all inventory, not merely the visible warehouse page",()=>{
 const start=app.indexOf("function applyAgedDiscount(){"),end=app.indexOf("function plan(){",start);
 assert.ok(start>=0&&end>start);
 const items=[
  {id:1,ageDays:8,grade:"A",zone:"warehouse",price:1000},
  {id:2,ageDays:1,grade:"C",zone:"shelf",price:700},
  {id:3,ageDays:1,grade:"A",zone:"warehouse",price:800},
  {id:4,ageDays:12,grade:"C",zone:"workshop",price:600},
  {id:5,ageDays:9,grade:"B",zone:"warehouse",price:900}
 ];
 const staged=new Map(),notice={textContent:""},pct={value:"20"};
 const $=id=>id==="agedDiscountPct"?pct:notice;
 let repaints=0,budget=0;
 const apply=new Function("captureStockDrafts","priceDrafts","storeItems","renderInventory","$","refreshBudget",
  "recoveryBlocked","onboardingRequired","state",app.slice(start,end)+"return applyAgedDiscount;")(
  ()=>{},staged,()=>items,()=>repaints++,$,()=>budget++,false,false,{pendingMonth:false});
 apply();
 assert.deepEqual([...staged.entries()],[[1,800],[2,560],[5,720]]);
 assert.deepEqual(items.map(x=>x.price),[1000,700,800,600,900],"no saved price is modified before confirmation");
 assert.match(notice.textContent,/全在庫の対象3点/);
 apply();assert.equal(staged.get(1),800,"discounts are non-stacking");
 pct.value="50";apply();
 assert.deepEqual([...staged.entries()],[[1,500],[2,350],[5,450]]);
 assert.equal(repaints,3);assert.equal(budget,3);
});
test("cross-page staged inputs are included only for valid inventory IDs",()=>{
 const start=app.indexOf("function plan(){"),end=app.indexOf("function refreshBudget(){",start);
 assert.ok(start>0&&end>start);
 const priceDrafts=new Map([[1,550],[2,777],[400,80]]);
 const repairDrafts=new Set([1,3]),listingDrafts=new Set([1,2,3]);
 const items=[{id:1,zone:"warehouse",grade:"C"},{id:2,zone:"shelf",grade:"A"},{id:3,zone:"workshop",grade:"B"}];
 const doc={querySelectorAll:()=>[]},$=()=>({checked:false});
 const plan=new Function("document","captureStockDrafts","priceDrafts","repairDrafts","listingDrafts","storeItems","$",
  app.slice(start,end)+"return plan;")(doc,()=>{},priceDrafts,repairDrafts,listingDrafts,()=>items,$);
 const result=plan();
 assert.deepEqual(result.prices,[{id:1,price:550},{id:2,price:777}]);
 assert.deepEqual(result.repairs,[1]);
 assert.deepEqual(result.list,[1]);
 assert.equal(result.equipmentUpgrade,false);
});
test("warehouse pagination and live-commit draft invalidation remain in place",()=>{
 assert.match(html,/id="agedDiscountBtn"/);
 assert.match(app,/captureStockDrafts\(\);warehousePage=/);
 assert.match(app,/check\.checked=repairDrafts\.has\(p\.id\)/);
 assert.match(app,/check\.checked=listingDrafts\.has\(p\.id\)/);
 assert.match(app,/function commitLive\(next\)\{state=\{\.\.\.state,liveSession:next\};clearStockDrafts\(\);persist\(\);\}/);
 assert.match(app,/applyPlan\(true\)/);
});

test("sale-probability preview uses the uncommitted price and flags it as a draft",()=>{
 const a=app.indexOf("function updatePricePreview("),b=app.indexOf("function applyAgedDiscount(){",a);
 assert.ok(a>=0&&b>a);
 const source=app.slice(a,b);
 const item={id:3,type:"console",grade:"B",price:26000,fair:26000};
 const saved={seed:1,day:1,reputation:55};
 const mock={saleChance:(type,grade,price)=>price===26000?.30:.47,
             marketDemand:()=>1,safePrice:()=>({breakEven:20000,target:28000})};
 const display={textContent:""};
 const fn=new Function("E","state","yen",source+"return updatePricePreview;")(mock,saved,x=>x+"円");
 fn(item,display,26000);assert.match(display.textContent,/確定価格/);
 assert.match(display.textContent,/30%/);
 fn(item,display,20800);assert.match(display.textContent,/未確定の仮価格/);
 assert.match(display.textContent,/47%/);
 fn(item,display,0);assert.match(display.textContent,/指定してください/);
 assert.match(app,/event\.target\.matches\('\[data-stock-price\]'\)/);
});
