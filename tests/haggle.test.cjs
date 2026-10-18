"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const S=require("../src/shop.js");
test("full asking price is accepted and legacy buy plans remain identical",()=>{
 const s=S.initial(21),offer=S.offers(s)[0];
 const legacy=S.advance(s,{buy:[{id:offer.id,price:offer.defaultPrice}],prices:[]});
 const explicit=S.advance(s,{buy:[{id:offer.id,price:offer.defaultPrice,bid:offer.ask}],prices:[]});
 assert.deepEqual(legacy,explicit);
 assert.equal(explicit.report.bought,1);
 assert.equal(explicit.report.rejectedOffers.length,0);
 assert.equal(explicit.report.negotiationSavings,0);
});
test("a very low bid is rejected without charging for inventory",()=>{
 const s=S.initial(18),offer=S.offers(s)[0];
 const out=S.advance(s,{buy:[{id:offer.id,price:offer.defaultPrice,bid:100}],prices:[]});
 assert.equal(out.report.bought,0);
 assert.equal(out.report.procurement,0);
 assert.equal(out.report.rejectedOffers.length,1);
 assert.equal(out.report.rejectedOffers[0].bid,100);
 assert.equal(out.state.inventory.length,0);
 assert.equal(out.state.cash,s.cash-S.RENT);
 assert.equal(s.day,1);
});
test("bargain acceptance saves cash and lowers acquired item cost, not sale revenue",()=>{
 let success=null;
 for(let seed=1;seed<100&&!success;seed++){
  const s=S.initial(seed),o=S.offers(s)[0],bid=Math.max(100,Math.round(o.ask*.9/100)*100);
  const out=S.advance(s,{buy:[{id:o.id,price:1000000,bid}],prices:[]});
  if(out.report.bought){success={s,o,bid,out};}
 }
 assert.ok(success,"some offers should accept a discount");
 const {s,o,bid,out}=success;
 assert.ok(bid<o.ask);
 assert.equal(out.report.negotiationSavings,o.ask-bid);
 assert.equal(out.report.procurement,bid);
 assert.equal(out.state.cash,s.cash-bid-S.RENT+out.report.revenue);
 assert.equal(out.report.profit,out.report.revenue-out.report.cogs-S.RENT);
 if(out.state.inventory.length)assert.equal(out.state.inventory[0].cost,bid);
});
test("seller responds deterministically on repeated calls, even after JSON round trip",()=>{
 const s=S.initial(31),o=S.offers(s)[1],p={buy:[{id:o.id,price:o.defaultPrice,bid:Math.round(o.ask*.78/100)*100}],prices:[]};
 const a=S.advance(s,p),b=S.advance(JSON.parse(JSON.stringify(s)),p);
 assert.deepEqual(a,b);
 assert.deepEqual(S.validate(JSON.parse(JSON.stringify(a.state))),a.state);
});
test("an invalid bid never mutates cash or inventory",()=>{
 const s=S.initial(19),o=S.offers(s)[0],before=JSON.stringify(s);
 for(const bid of [0,-1,o.ask+100,1.5,NaN]){
  assert.throws(()=>S.advance(s,{buy:[{id:o.id,price:o.defaultPrice,bid}],prices:[]}),/買取提示額/);
  assert.equal(JSON.stringify(s),before);
 }
});
test("three-step UI exposes buy bid field and consistent budget calculation",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const ui=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.match(ui,/data\.offerBid/);
 assert.match(ui,/data-offer-bid/);
 assert.match(ui,/negotiationSavings/);
 assert.match(ui,/rejectedOffers/);
 assert.match(ui,/sum\+item\.bid/);
 assert.equal((html.match(/class="step"/g)||[]).length,3);
});
