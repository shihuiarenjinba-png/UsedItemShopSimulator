"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),E=require("../src/shop.js");
const fixed=(o)=>({buy:[{id:o.id,price:o.defaultPrice,mode:"fixed"}],prices:[]});
function buyUnsold(seed=12){
 const s=E.initial(seed),o=E.offers(s)[0];
 const a=E.advance(s,fixed(o));
 assert.equal(a.report.sold,0,"newly bought goods should never directly appear on the counter");
 return a.state;
}
test("15000 of 25000 yen now has meaningful odds; urgency matters",()=>{
 const p={
  rush:E.offerProbability(25000,15000,"rush"),
  normal:E.offerProbability(25000,15000,"normal"),
  careful:E.offerProbability(25000,15000,"careful")
 };
 assert.ok(p.normal>.5,"typical bid of 60% must not be near-zero");
 assert.ok(p.rush>p.normal&&p.normal>p.careful);
 for(const role of E.STAFF)assert.ok(E.offerProbability(25000,20000,role.id)>E.offerProbability(25000,15000,role.id));
 assert.equal(E.offerProbability(25000,25000),1);
});
test("buyer count, kind and arrival times vary by seed but repeat exactly on save",()=>{
 const start=E.initial(35),first=E.customerArrivals(start);
 assert.deepEqual(first,E.customerArrivals(JSON.parse(JSON.stringify(start))));
 assert.ok(first.every(x=>/^(1[0-8]):[0-5][0-9]$/.test(x.arrival)));
 assert.deepEqual(first.map(x=>x.arrival),[...first].map(x=>x.arrival).sort());
 const counts=new Set();for(let seed=1;seed<=40;seed++)counts.add(E.customerArrivals(E.initial(seed)).length);
 assert.ok(counts.size>2,"customer count should not be fixed");
 const offers=E.offers(start);assert.equal(offers.length,3);
 assert.ok(offers.every(x=>x.seller&&x.sellerIcon&&/^(1[0-7]):[0-5][0-9]$/.test(x.arrival)));
});
test("newly purchased items are held in the warehouse, not sold on the same day",()=>{
 const st=buyUnsold();
 assert.equal(st.inventory.length,1);
 assert.equal(st.inventory[0].zone,"warehouse");
 assert.equal(st.inventory[0].acquiredDay,1);
 assert.equal(st.inventory[0].ageDays,1);
 assert.equal(st.totalSold,0);
});
test("warehouse goods require explicit listing and shelf capacity is independent of storage",()=>{
 let s=buyUnsold();
 const noListing=E.advance(s,{buy:[],prices:[]});
 assert.equal(noListing.report.sold,0);
 assert.ok(noListing.state.inventory[0].zone==="warehouse");
 const id=s.inventory[0].id;
 const withListing=E.advance(s,{buy:[],prices:[],list:[id]});
 assert.ok(!withListing.state.inventory.length||withListing.state.inventory[0].zone==="shelf");
 const bad=JSON.stringify(s);
 assert.throws(()=>E.advance(s,{buy:[],prices:[],list:[id,id]}),/重複|不正/);
 assert.throws(()=>E.advance(s,{buy:[],prices:[],list:[900000]}),/並べ/);
 assert.equal(JSON.stringify(s),bad);
});
test("repair requires a day in the workshop before it can return to the warehouse",()=>{
 let s;for(let seed=1;seed<20;seed++){const x=buyUnsold(seed);if(x.inventory[0].grade!=="A"){s=x;break;}}
 assert.ok(s,"expected a repairable inventory item");
 const id=s.inventory[0].id,starting=s.cash,price=E.repairPrice(s.inventory[0],1);
 const sent=E.advance(s,{buy:[],prices:[],repairs:[id]});
 assert.equal(sent.state.inventory[0].zone,"workshop");
 assert.equal(sent.state.inventory[0].repairReadyDay,s.day+1);
 assert.equal(sent.report.repairSpending,price);
 assert.equal(sent.state.cash,starting-price-E.RENT);
 assert.throws(()=>E.advance(sent.state,{buy:[],prices:[],list:[id]}),/並べ/);
 const completed=E.advance(sent.state,{buy:[],prices:[]});
 assert.equal(completed.state.inventory[0].zone,"warehouse");
 assert.deepEqual(E.validate(JSON.parse(JSON.stringify(completed.state))),completed.state);
 const listed=E.advance(completed.state,{buy:[],prices:[],list:[id]});
 assert.ok(listed.report.customerCount>=0);
});
test("equipment investment is explicit, capitalized in cash, and lowers later repair costs",()=>{
 let s;for(let seed=1;seed<=16;seed++){const x=buyUnsold(seed);if(x.inventory[0].grade!=="A"){s=x;break;}}
 const x=s.inventory[0],id=x.id;
 const base=E.advance(s,{buy:[],prices:[],repairs:[id]});
 const upgraded=E.advance(s,{buy:[],prices:[],repairs:[id],equipmentUpgrade:true});
 assert.equal(base.report.equipmentCost,0);
 assert.equal(upgraded.report.equipmentCost,E.EQUIPMENT_UPGRADE_COST);
 assert.equal(upgraded.state.equipmentLevel,2);
 assert.equal(upgraded.report.repairSpending,E.repairPrice(x,2));
 assert.ok(upgraded.report.repairSpending<base.report.repairSpending);
 assert.equal(upgraded.state.cash,s.cash-E.RENT-upgraded.report.repairSpending-E.EQUIPMENT_UPGRADE_COST);
 assert.throws(()=>E.advance(upgraded.state,{buy:[],prices:[],equipmentUpgrade:true}),/強化/);
});
test("each visitor buys at most one displayed item and no more than unique available goods sell",()=>{
 let s=buyUnsold();
 const item=s.inventory[0];
 const out=E.advance(s,{buy:[],prices:[{id:item.id,price:100}],list:[item.id]});
 assert.ok(out.report.sold<=out.report.customerCount);
 assert.ok(out.report.sold<=1);
 assert.equal(out.report.customers.filter(x=>x.bought).length,out.report.sold);
 assert.equal(out.state.cash,s.cash-E.RENT+out.report.revenue);
});
test("price-safety advisor includes holding and rent, warns when priced below expected break-even",()=>{
 const s=buyUnsold(),item=s.inventory[0];
 const cheap=E.safePrice({...item,price:500},s,21);
 const full=E.safePrice({...item,price:500000},s,21);
 assert.ok(cheap.breakEven>item.cost);
 assert.ok(cheap.carrying>0&&cheap.allocatedRent>0);
 assert.ok(cheap.profitBuffer<0&&/採算割れ/.test(cheap.warning));
 assert.ok(full.profitBuffer>0);
 assert.equal(full.target,cheap.target,"a proposed retail price must not alter break-even calculation");
});
test("old saves lacking equipment and zones remain readable and in-store legacy goods remain on sale",()=>{
 const s=E.initial(3);delete s.equipmentLevel;
 s.inventory=[{id:101,type:"camera",grade:"B",fair:26000,cost:10000,price:29000,ageDays:0,wearDays:0}];
 const valid=E.validate(s);
 assert.equal(valid.inventory[0].zone,undefined);
 assert.equal(valid.equipmentLevel,undefined);
 const next=E.advance(valid,{buy:[],prices:[]});
 assert.ok(next.state.equipmentLevel>=1);
 assert.deepEqual(E.validate(JSON.parse(JSON.stringify(next.state))),next.state);
});
test("forged future repair time or impossible equipment level is rejected",()=>{
 const s=buyUnsold(),bad=JSON.parse(JSON.stringify(s));
 bad.inventory[0].zone="workshop";bad.inventory[0].repairReadyDay=100;
 assert.throws(()=>E.validate(bad),/修理完了日/);
 const other=JSON.parse(JSON.stringify(s));other.equipmentLevel=8;
 assert.throws(()=>E.validate(other),/設備レベル/);
});
