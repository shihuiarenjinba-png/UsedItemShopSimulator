"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/shop.js");
test("20-minute small-shop footfall reaches a useful but bounded number of customers",()=>{
 let visitors=0;for(let seed=1;seed<=100;seed++)visitors+=E.customerArrivals(E.initial(seed)).length;
 const avg=visitors/100;
 assert.ok(avg>=7&&avg<=11,"unexpected average visitors: "+avg);
});
test("30-day 24-seed simulation retains working capital while allowing zero-sale days",()=>{
 const results=[];
 for(let seed=1;seed<=24;seed++){
  let s=E.startGame("normal",seed),zeroDays=0;
  for(let d=0;d<30;d++){
   const shelf=s.inventory.filter(x=>x.zone==="shelf").length;
   const list=s.inventory.filter(x=>x.zone==="warehouse")
    .slice(0,E.SHELF_CAPACITY-shelf).map(x=>x.id);
   const offer=E.offers(s)[0],buy=s.inventory.length<E.CAPACITY&&s.cash>150000?
    [{id:offer.id,price:offer.defaultPrice}]:[];
   const r=E.advance(s,{buy,prices:[],list});
   zeroDays+=Number(r.report.sold===0);
   assert.ok(r.report.sold<=r.report.customerCount);
   assert.ok(r.state.cash>=0);
   s=r.state;
  }
  results.push({cash:s.cash,zeroDays,month:E.monthlySummary(s,1)});
 }
 const avgZero=results.reduce((a,b)=>a+b.zeroDays,0)/results.length;
 const avgCash=results.reduce((a,b)=>a+b.cash,0)/results.length;
 assert.ok(avgZero<6&&avgZero>0,"unexpected average zero-sales days: "+avgZero);
 assert.ok(avgCash>700000,"simplified steady purchasing strategy must not regularly wipe out startup funds");
 assert.ok(results.every(x=>x.month.fullBreakdown&&x.month.revenue>=0));
});
