"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),S=require("../src/shop.js");
test("cars enter the late-game premium supplier pool without changing day-one legacy offers",()=>{
 const early=S.offers(S.initial(20261018));
 assert.equal(early.some(x=>x.type==="car"),false);
 let cars=0;
 for(let seed=1;seed<=70;seed++){
  let s=S.initial(seed);
  for(let i=0;i<20;i++)s=S.advance(s,{buy:[],prices:[]}).state;
  assert.equal(s.day,21);
  const available=S.offers(s).filter(o=>o.type==="car");
  cars+=available.length;
  for(const car of available){
   assert.ok(car.ask<=1000000&&car.defaultPrice<=1000000);
   assert.ok(car.ask>0&&car.fair>0);
  }
 }
 assert.ok(cars>5,"there should be occasional used-car offers in later months");
});
test("forged premature inventory wear is not accepted as a legitimate save",()=>{
 const s=S.initial(8);
 s.inventory=[{id:101,type:"camera",grade:"B",fair:22000,price:25000,cost:8000,ageDays:140,wearDays:1}];
 assert.throws(()=>S.validate(s),/保管日数/);
});
test("depreciation remains gradual and repair restarts the next wear interval",()=>{
 let item={id:3,type:"book",grade:"A",fair:8000,price:8800,cost:5000,ageDays:0,wearDays:0};
 for(let i=0;i<30;i++)item=S.ageItem(item);
 assert.equal(item.grade,"A","books should wear slower than fragile electronics");
 assert.ok(item.fair<8000&&item.fair>6500);
 for(let i=0;i<14;i++)item=S.ageItem(item);
 assert.equal(item.grade,"B");
 assert.equal(item.price,8800);
});
