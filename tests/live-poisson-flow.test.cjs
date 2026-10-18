"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/shop.js"),L=require("../src/live.js"),T=require("../src/time.js");
const newGame=(seed=27)=>E.startGame("normal",seed);
test("daily count is Poisson sampled, fixed by seed, with three independent sellers",()=>{
 let total=0,variable=new Set();
 for(let seed=1;seed<=200;seed++){
  const s=newGame(seed),events=L.schedule(s),buy=events.filter(x=>x.kind==="buyer");
  total+=events.length;variable.add(events.length);
  assert.equal(events.filter(x=>x.kind==="seller").length,3);
  assert.deepEqual(events,L.schedule(E.validate(JSON.parse(JSON.stringify(s)))));
  assert.ok(events.every(x=>x.minute>=600&&x.minute<1140));
  assert.deepEqual(events.map(x=>x.minute),[...events].map(x=>x.minute).sort((a,b)=>a-b));
  assert.equal(new Set(events.map(x=>x.key)).size,events.length);
  assert.equal(buy.length,E.customerArrivals(s).length);
 }
 const average=total/200;
 assert.ok(average>=6.3&&average<=8.8,"unexpected total visitor average "+average);
 assert.ok(variable.size>4,"Poisson counts should vary");
});
test("skipping at 10:00 produces no visits or purchases, but rent and calendar advance",()=>{
 const s=newGame(),session=L.initial(s),out=L.finish(s,session);
 assert.equal(out.report.customerCount,0);
 assert.equal(out.report.bought,0);
 assert.equal(out.report.sold,0);
 assert.equal(out.report.revenue,0);
 assert.equal(out.report.skippedVisitors,L.schedule(s).length);
 assert.equal(out.state.cash,s.cash-E.RENT);
 assert.equal(out.state.day,2);
});
test("first seller pauses clock at their arrival; skipping then drops seller and future buyers",()=>{
 const state=newGame(6),events=L.schedule(state),firstSeller=events.find(x=>x.kind==="seller");
 const result=L.until(state,L.initial(state),firstSeller.minute);
 assert.equal(result.interrupted,true);
 assert.equal(result.session.pendingSeller,firstSeller.id);
 assert.equal(result.minute,firstSeller.minute);
 const skipped=L.finish(state,result.session);
 assert.equal(skipped.report.bought,0);
 assert.equal(skipped.report.skippedVisitors,events.length-result.session.cursor);
 assert.equal(skipped.state.cash,state.cash-E.RENT);
});
test("an accepted trade commits once, is kept on skip, and the item starts in warehouse",()=>{
 const s=newGame(16),seller=L.schedule(s).find(x=>x.kind==="seller");
 const first=L.until(s,L.initial(s),seller.minute);
 const offer=E.offers(s).find(x=>x.id===first.session.pendingSeller);
 const answered=L.respond(s,first.session,{id:offer.id,mode:"fixed",price:offer.defaultPrice});
 assert.equal(answered.session.procurement,offer.ask);
 assert.equal(answered.session.inventory[0].zone,"warehouse");
 const after=L.finish(s,answered.session);
 assert.equal(after.report.bought,1);
 assert.equal(after.report.procurement,offer.ask);
 assert.equal(after.report.sold,0);
 assert.equal(after.state.cash,s.cash-offer.ask-E.RENT);
 assert.equal(after.report.skippedVisitors,L.schedule(s).length-answered.session.cursor);
});
test("seller can be refused without cash changes; accepting cannot be repeated",()=>{
 const s=newGame(8),seller=L.schedule(s).find(x=>x.kind==="seller");
 const paused=L.until(s,L.initial(s),seller.minute);
 const o=E.offers(s).find(x=>x.id===paused.session.pendingSeller);
 const refused=L.respond(s,paused.session,null);
 assert.equal(refused.session.cash,s.cash);
 assert.equal(refused.session.bought,0);
 assert.throws(()=>L.respond(s,refused.session,{id:o.id,price:o.defaultPrice}),/対応中/);
});
test("no buyer may sell unstocked goods; already-sold goods cannot be sold twice",()=>{
 let s=newGame(46),live=L.initial(s);
 const buyers=L.schedule(s).filter(x=>x.kind==="buyer");
 for(const buyer of buyers){
  let r=L.until(s,live,buyer.minute);
  while(r.interrupted){live=L.respond(s,r.session,null).session;r=L.until(s,live,buyer.minute);}
  live=r.session;
 }
 assert.equal(live.revenue,0);
 assert.equal(live.customers.length,buyers.length);
 assert.equal(live.sold,0);
});
test("interactive listing and pricing affect buyer outcomes at visit time, not at close",()=>{
 const original=newGame(34);
 let s=E.advance(original,{buy:[{id:E.offers(original)[0].id,price:100}],prices:[]}).state;
 if(s.pendingMonth)s=E.closeMonthlyReview(s,0).state;
 let live=L.initial(s);
 assert.equal(live.inventory[0].zone,"warehouse");
 live=L.configure(s,live,{prices:[{id:live.inventory[0].id,price:100}],list:[live.inventory[0].id]});
 assert.equal(live.inventory[0].zone,"shelf");
 let outcome=L.until(s,live,1140),guard=0;
 while(outcome.interrupted&&guard++<4){
  live=L.respond(s,outcome.session,null).session;
  outcome=L.until(s,live,1140);
 }
 assert.equal(outcome.interrupted,false);
 assert.ok(outcome.session.sold<=1);
 assert.equal(outcome.session.sold,outcome.session.customers.filter(x=>x.bought).length);
 const settled=L.finish(s,outcome.session);
 assert.equal(settled.report.sold,outcome.session.sold);
 assert.deepEqual(E.validate(settled.state),settled.state);
});
test("tool purchases use fixed prices; repair shows progress and supports partial sale",()=>{
 let s;for(let seed=1;seed<15;seed++){
  const base=newGame(seed),o=E.offers(base)[0],a=E.advance(base,{buy:[{id:o.id,price:o.defaultPrice}],prices:[]}).state;
  if(a.inventory[0].grade!=="A"){s=a;break;}
 }
 assert.ok(s);
 let current=L.initial(s),id=current.inventory[0].id;
 current=L.configure(s,current,{repairs:[id]});
 assert.equal(current.inventory[0].zone,"workshop");
 assert.equal(current.inventory[0].repairProgress,0);
 const initialCash=current.cash;
 current=L.workOn(s,current,id,"brush");
 assert.equal(current.inventory[0].repairProgress,18);
 current=L.buyTool(s,current,"driver");
 assert.equal(current.cash,initialCash-4800);
 assert.throws(()=>L.buyTool(s,current,"driver"),/購入済み/);
 current=L.workOn(s,current,id,"driver");
 assert.equal(current.inventory[0].repairProgress,45);
 current=L.stopRepair(s,current,id);
 assert.equal(current.inventory[0].zone,"warehouse");
 assert.equal(current.inventory[0].repairProgress,45);
 current=L.configure(s,current,{list:[id]});
 assert.equal(current.inventory[0].zone,"shelf");
 const settled=L.finish(s,current);
 assert.equal(settled.state.inventory[0].repairProgress,45);
 assert.ok(settled.state.ownedTools.includes("driver"));
});
test("repair work persists over multiple days without self-completing; fully repaired grade improves",()=>{
 let base;for(let seed=1;seed<=15;seed++){
  const s=newGame(seed),a=E.advance(s,{buy:[{id:E.offers(s)[0].id,price:10000}],prices:[]}).state;
  if(a.inventory[0].grade==="C"){base=a;break;}
 }
 assert.ok(base);
 let session=L.initial(base),id=session.inventory[0].id;
 session=L.configure(base,session,{repairs:[id]});
 session=L.workOn(base,session,id,"brush");
 let next=L.finish(base,session).state;
 assert.equal(next.inventory[0].zone,"workshop");
 assert.equal(next.inventory[0].repairProgress,18);
 const second=L.initial(next);
 assert.equal(second.inventory[0].zone,"workshop");
 session=L.completeToolset(next,second);
 for(const tool of ["solder","solder","solder"])session=L.workOn(next,session,id,tool);
 assert.equal(session.inventory[0].zone,"warehouse");
 assert.equal(session.inventory[0].grade,"B");
 assert.equal(session.inventory[0].repairProgress,100);
});
test("live bank ledger closes day exactly once; monthly interest and monthly review still work",()=>{
 let s=newGame(4);
 for(let n=1;n<=30;n++){
  const r=L.finish(s,L.initial(s));
  s=r.state;
 }
 assert.equal(s.day,31);
 assert.deepEqual(s.pendingMonth,{month:1});
 assert.equal(E.monthlySummary(s,1).rent,105000);
 assert.throws(()=>L.initial(s),/営業できる日/);
 const next=E.closeMonthlyReview(s,0).state;
 assert.equal(next.pendingMonth,undefined);
});
