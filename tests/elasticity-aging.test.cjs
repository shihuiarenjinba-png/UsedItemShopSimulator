"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),S=require("../src/shop.js");
const single=(o,extra={})=>({buy:[{id:o.id,price:o.defaultPrice,...extra}],prices:[]});
test("supplier acceptance probability rises with our offer",()=>{
 const ask=20000,ratios=[.6,.7,.8,.9,1],values=ratios.map(x=>S.offerProbability(ask,Math.round(ask*x)));
 for(let i=1;i<values.length;i++)assert.ok(values[i]>values[i-1]);
 assert.equal(S.offerProbability(ask,ask),1);
 assert.ok(S.offerProbability(ask,ask*.6)>0);
});
test("higher bid increases realized trade count over many independent seeded sellers",()=>{
 let low=0,high=0;
 for(let seed=1;seed<=180;seed++){
  const s=S.initial(seed),o=S.offers(s)[0];
  for(const [ratio,label] of [[.65,"low"],[.95,"high"]]){
   const bid=Math.round(o.ask*ratio/100)*100;
   const result=S.advance(s,single(o,{mode:"negotiate",bid}));
   if(label==="low")low+=result.report.bought;else high+=result.report.bought;
  }
 }
 assert.ok(high>low+45,"supply response missing: low "+low+", high "+high);
});
test("standard failed negotiation cannot buy while full asking price can",()=>{
 const s=S.initial(18),o=S.offers(s)[0];
 const rejected=S.advance(s,single(o,{mode:"negotiate",bid:100}));
 const fixed=S.advance(s,single(o,{mode:"fixed",bid:100}));
 assert.equal(rejected.report.bought,0);
 assert.equal(rejected.report.rejectedOffers.length,1);
 assert.equal(rejected.state.cash,s.cash-S.RENT);
 assert.equal(fixed.report.bought,1);
 assert.equal(fixed.report.procurement,o.ask);
});
test("only opted-in fallback pays list or premium after failed negotiation",()=>{
 const s=S.initial(18),o=S.offers(s)[0],bid=100;
 const atList=S.advance(s,single(o,{mode:"negotiate",bid,fallback:"ask"}));
 const premium=S.advance(s,single(o,{mode:"negotiate",bid,fallback:"premium"}));
 assert.equal(atList.report.bought,1);
 assert.equal(atList.report.procurement,o.ask);
 assert.equal(premium.report.bought,1);
 assert.equal(premium.report.procurement,S.counterPrice(o.ask,"premium"));
 assert.ok(premium.report.procurement>o.ask);
 assert.equal(premium.state.cash,s.cash-premium.report.procurement-S.RENT+premium.report.revenue);
 assert.equal(s.cash,700000);
});
test("old fixed-price plans and saved inventories remain playable",()=>{
 const s=S.initial(12),o=S.offers(s)[0];
 const fromV1=S.advance(s,single(o));
 const same=S.advance(JSON.parse(JSON.stringify(s)),single(o,{mode:"fixed"}));
 assert.deepEqual(fromV1,same);
 const legacy=JSON.parse(JSON.stringify(fromV1.state));
 for(const x of legacy.inventory){delete x.ageDays;delete x.wearDays;}
 const follow=S.advance(legacy,{buy:[],prices:[]});
 assert.equal(follow.state.day,legacy.day+1);
 assert.deepEqual(S.validate(follow.state),follow.state);
});
test("more expensive sale prices reduce buying probability with category-specific elasticity",()=>{
 const ref=25000;
 for(const type of Object.keys(S.TYPES)){
  const low=S.saleChance(type,"B",ref,ref,10);
  const high=S.saleChance(type,"B",Math.round(ref*1.5),ref,10);
  assert.ok(high<low,type+" high-price probability must be lower");
  assert.ok(S.TYPES[type].elasticity>0);
 }
 const ratio=type=>S.saleChance(type,"B",Math.round(ref*1.5),ref,10)/S.saleChance(type,"B",ref,ref,10);
 assert.ok(ratio("console")<ratio("camera"));
});
test("waiting wears unsold goods and decreases fair value without changing list price",()=>{
 let item={id:5,type:"camera",grade:"A",fair:45000,cost:26000,price:160000,ageDays:0,wearDays:0};
 const start=item.fair;
 for(let i=0;i<30;i++)item=S.ageItem(item);
 assert.equal(item.ageDays,30);
 assert.equal(item.grade,"B");
 assert.equal(item.wearDays,0);
 assert.equal(item.price,160000);
 assert.ok(item.fair<start*.93);
 const repaired=S.advance({...S.initial(7),day:2,history:[{day:1,profit:-S.RENT,cash:700000-S.RENT,sold:0}],
  cash:700000-S.RENT,inventory:[{...item,ageDays:1,wearDays:1}]},
  {buy:[],prices:[{id:item.id,price:160000}],repairs:[item.id]});
 assert.equal(repaired.report.repaired,1);
 assert.equal(repaired.report.repairSpending,Math.max(100,Math.round(item.fair*.12/100)*100));
});
test("expected units and realized sales never exceed discrete available stock",()=>{
 for(let seed=1;seed<=32;seed++){
  let state=S.initial(seed);
  for(let day=0;day<12;day++){
   const o=S.offers(state)[0];
   const decision=state.inventory.length<S.CAPACITY?single(o,{mode:"fixed"}):{buy:[],prices:[]};
   const result=S.advance(state,decision);
   assert.ok(result.report.expectedSales>=0);
   assert.ok(result.report.expectedSales<=state.inventory.length+result.report.bought);
   assert.ok(result.report.sold<=state.inventory.length+result.report.bought);
   assert.equal(result.state.cash,state.cash-result.report.procurement-result.report.repairSpending-S.RENT+result.report.revenue);
   state=result.state;
  }
 }
});
test("unknown fallback, excessive bids and invalid modes fail without mutating state",()=>{
 const s=S.initial(4),o=S.offers(s)[0],before=JSON.stringify(s);
 for(const bad of [{mode:"negotiate",bid:o.ask+1},{mode:"negotiate",bid:100,fallback:"surprise"},{mode:"surprise"}])
  assert.throws(()=>S.advance(s,single(o,bad)));
 assert.equal(JSON.stringify(s),before);
});
