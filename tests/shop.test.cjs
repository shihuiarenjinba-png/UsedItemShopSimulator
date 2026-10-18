"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),S=require('../src/shop.js');
const buyOne=(offer)=>({buy:[{id:offer.id,price:offer.defaultPrice}],prices:[]});
test('deterministic offers and next day',{timeout:5000},()=>{
 const a=S.initial(123),b=S.initial(123);assert.deepEqual(S.offers(a),S.offers(b));
 assert.deepEqual(S.advance(a,buyOne(S.offers(a)[0])),S.advance(b,buyOne(S.offers(b)[0])));
});
test('higher prices lower sale chances all else equal',()=>{
 for(const type of Object.keys(S.TYPES))for(const grade of Object.keys(S.GRADES)){
  const fair=S.TYPES[type].base*S.GRADES[grade];
  const cheap=Math.round(fair*0.85),expensive=Math.round(fair*1.50);
  assert.ok(S.saleChance(type,grade,cheap,fair,1)>S.saleChance(type,grade,expensive,fair,1));
 }
});
test('purchases, sales and rent balance cash without double-counting procurement',()=>{
 const original=S.initial(55);const o=S.offers(original)[0];const {state,report}=S.advance(original,buyOne(o));
 assert.equal(state.cash,original.cash-report.procurement-S.RENT+report.revenue);
 assert.equal(report.profit,report.revenue-report.cogs-S.RENT);
 assert.equal(report.inventory+report.sold,report.bought);
 assert.equal(original.cash,700000);assert.equal(original.inventory.length,0);
});
test('cannot buy duplicate, unknown item, or above capacity',()=>{
 const a=S.initial(),o=S.offers(a)[0];
 assert.throws(()=>S.advance(a,{buy:[{id:o.id,price:500},{id:o.id,price:600}],prices:[]}),/重複/);
 assert.throws(()=>S.advance(a,{buy:[{id:9999,price:500}],prices:[]}),/不正/);
 let b=S.initial();b.inventory=Array.from({length:S.CAPACITY},(_,i)=>({id:10000+i,type:'book',grade:'B',price:5000,cost:2000,fair:6000}));
 assert.throws(()=>S.advance(b,buyOne(S.offers(b)[0])),/在庫|売場/);
});
test('insufficient working capital blocks without a negative wallet',()=>{
 const a=S.initial();a.cash=100;
 assert.throws(()=>S.advance(a,{buy:[],prices:[]}),/資金/);
 assert.equal(a.cash,100);
});
test('sales stay within inventory, and state can survive save/restore',()=>{
 let s=S.initial(222);
 for(let d=0;d<100;d++){
  const offer=S.offers(s)[0];const plan=s.cash>100000&&s.inventory.length<S.CAPACITY?
    buyOne(offer):{buy:[],prices:[]};
  if(s.cash<S.RENT)break;
  const outcome=S.advance(s,plan);
  assert.ok(outcome.report.sold<=s.inventory.length+outcome.report.bought);
  assert.ok(outcome.state.cash>=0);
  assert.deepEqual(S.validate(JSON.parse(JSON.stringify(outcome.state))),outcome.state);
  s=outcome.state;
 }
});
test('corrupted or forged saves are rejected',()=>{
 const s=S.initial();s.inventory=[{id:1,type:'invalid',grade:'A',cost:1,price:2,fair:5000}];
 assert.throws(()=>S.validate(s),/在庫/);
});
test('invalid fair value cannot bypass demand validation',()=>{
 const s=S.initial();s.inventory=[{id:10,type:'book',grade:'A',cost:100,price:500,fair:0}];
 assert.throws(()=>S.validate(s),/目利き/);
});

test("corrupted sales totals or nonsequential day records cannot be restored",()=>{
 const initial=S.initial(42),item=S.offers(initial)[0];
 const next=S.advance(initial,buyOne(item)).state;
 const forged=JSON.parse(JSON.stringify(next));forged.totalSold+=1;
 assert.throws(()=>S.validate(forged),/累計販売数/);
 const broken=JSON.parse(JSON.stringify(next));broken.history[0].day=99;
 assert.throws(()=>S.validate(broken),/履歴/);
});

test("repairing a used item upgrades grade, consumes cash and capitalizes its cost",()=>{
 let s=S.initial(5),o=S.offers(s)[0];
 s=S.advance(s,{buy:[{id:o.id,price:999999}],prices:[]}).state;
 const old=s.inventory[0];assert.notEqual(old.grade,'A');
 const repaired=S.advance(s,{buy:[],prices:[{id:old.id,price:999999}],repairs:[old.id]});
 const expense=Math.max(100,Math.round(old.fair*0.12/100)*100);
 assert.equal(repaired.report.repairSpending,expense);
 assert.equal(repaired.state.cash,s.cash-S.RENT-expense);
 const item=repaired.state.inventory[0];
 assert.equal(item.cost,old.cost+expense);
 assert.ok(item.fair>old.fair);
 assert.notEqual(item.grade,old.grade);
 assert.equal(s.inventory[0].grade,old.grade);
});
test("invalid or duplicate repair attempts never debit cash",()=>{
 let s=S.initial(5),o=S.offers(s)[0];s=S.advance(s,{buy:[{id:o.id,price:999999}],prices:[]}).state;
 const before=JSON.stringify(s),id=s.inventory[0].id;
 assert.throws(()=>S.advance(s,{buy:[],prices:[],repairs:[id,id]}),/重複/);
 assert.throws(()=>S.advance(s,{buy:[],prices:[],repairs:[99999]}),/修理/);
 assert.equal(JSON.stringify(s),before);
});
