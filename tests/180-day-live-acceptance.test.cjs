"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/shop.js"),L=require("../src/live.js");

test("twelve seeded 180-day campaigns buy, shelf, sell, settle months and round-trip saves",()=>{
 for(let seed=1;seed<=12;seed++){
  let state=E.startGame("easy",seed),sold=0,bought=0;
  for(let day=1;day<=180;day++){
   let session=L.initial(state);
   for(let event=0;event<40;event++){
    const current=L.until(state,session,1140);session=current.session;
    if(!current.interrupted)break;
    const offer=E.offers(state).find(o=>o.id===session.pendingSeller);
    const affordable=offer.ask+E.RENT+5000<session.cash;
    const take=session.inventory.length<17&&affordable?
     {mode:"fixed",bid:offer.ask,price:Math.max(1,Math.round(offer.fair*.88))}:null;
    session=L.respond(state,session,take).session;
    const shelf=session.inventory.filter(x=>x.zone==="shelf").length;
    const toList=session.inventory.filter(x=>x.zone==="warehouse")
      .slice(0,Math.max(0,E.SHELF_CAPACITY-shelf)).map(x=>x.id);
    if(toList.length)session=L.configure(state,session,{prices:[],list:toList,repairs:[]});
    assert.ok(event<39,"no infinite seller interruptions");
   }
   const result=L.finish(state,session);
   assert.equal(result.report.day,day);
   assert.equal(result.state.day,day+1);
   sold+=result.report.sold;bought+=result.report.bought;
   state=result.state;
   if(state.pendingMonth){
    assert.equal(state.pendingMonth.month,day/30);
    state=E.closeMonthlyReview(state,0).state;
   }
   if(day%30===0){
    assert.equal(state.history.length,day);
    assert.deepEqual(E.validate(JSON.parse(JSON.stringify(state))),state);
   }
  }
  assert.equal(state.day,181);assert.equal(state.monthDecisions.length,6);
  assert.ok(bought>250&&sold>250,"a functioning resale simulation must transact across 180 days");
  assert.ok(state.cash>=0);
 }
});

test("skipping unprocessed visitor arrivals prevents those sales and purchases",()=>{
 const seed=63,base=E.startGame("easy",seed),events=L.schedule(base);
 const started=L.initial(base);
 const result=L.finish(base,started);
 assert.equal(result.report.skippedVisitors,events.length);
 assert.equal(result.report.bought,0);
 assert.equal(result.report.sold,0);
 assert.equal(result.report.revenue,0);
 assert.equal(result.report.cash,base.cash-E.RENT);
 assert.equal(result.state.history.length,1);
});

test("midday seller interaction can be serialized without visiting or selling to absent customers",()=>{
 const base=E.startGame("normal",7),first=L.until(base,L.initial(base),1140);
 assert.equal(first.interrupted,true);
 assert.ok(first.session.pendingSeller!==null);
 const raw=JSON.parse(JSON.stringify(first.session));
 assert.deepEqual(L.validate(base,raw),first.session);
 const ignored=L.respond(base,raw,null).session;
 assert.equal(ignored.pendingSeller,null);
 assert.equal(ignored.bought,0);
 assert.equal(ignored.sold,0);
 const out=L.finish(base,ignored);
 assert.equal(out.report.bought,0);
 assert.ok(out.report.skippedVisitors>=0);
});
