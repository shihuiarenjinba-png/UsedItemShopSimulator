"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),E=require("../src/shop.js"),L=require("../src/live.js");
test("skip is a true cancellation: no future guests, transactions or revenue",()=>{
 for(let seed=1;seed<=40;seed++){
  const base=E.startGame("normal",seed),session=L.initial(base),planned=L.schedule(base);
  const closed=L.finish(base,session);
  assert.equal(closed.report.customerCount,0);
  assert.equal(closed.report.sold,0);
  assert.equal(closed.report.bought,0);
  assert.equal(closed.report.revenue,0);
  assert.equal(closed.report.skippedVisitors,planned.length);
  assert.equal(closed.state.day,2);
  assert.deepEqual(closed.state.inventory,base.inventory);
 }
});
test("all 180 live-event days, six month-end decisions and save replay stay consistent",()=>{
 for(let seed=1;seed<=10;seed++){
  let base=E.startGame("normal",seed);
  for(let day=1;day<=180;day++){
   if(base.pendingMonth)base=E.closeMonthlyReview(base,0).state;
   let live=L.initial(base);
   const shelf=live.inventory.filter(x=>(x.zone??"shelf")==="shelf").length;
   const list=live.inventory.filter(x=>x.zone==="warehouse").slice(0,Math.max(0,E.SHELF_CAPACITY-shelf)).map(x=>x.id);
   if(list.length)live=L.configure(base,live,{list});
   for(let guard=0;guard<12;guard++){
    const step=L.until(base,live,1140);live=step.session;
    if(!step.interrupted)break;
    const offer=E.offers(base).find(x=>x.id===live.pendingSeller);
    if(offer&&live.inventory.length<14&&live.cash>200000){
     try{live=L.respond(base,live,{mode:"fixed",bid:offer.ask,price:offer.defaultPrice}).session;}
     catch(e){live=L.respond(base,live,null).session;}
    }else live=L.respond(base,live,null).session;
    if(guard===11)assert.fail("visitor processing did not terminate");
   }
   const result=L.finish(base,live);base=result.state;
   assert.ok(base.cash>=0);assert.ok(base.inventory.length<=E.CAPACITY);
   assert.equal(E.validate(JSON.parse(JSON.stringify(base))).day,day+1);
  }
  assert.equal(base.day,181);
  assert.equal(base.history.length,180);
 }
});