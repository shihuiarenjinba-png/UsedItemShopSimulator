"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/shop.js"),L=require("../src/live.js");
test("committed 20-percent price change reaches actual sales engine and customer pricing",()=>{
 const s=E.startGame("easy",1);
 const first=L.until(s,L.initial(s),1140);
 assert.equal(first.interrupted,true);
 const offer=E.offers(s).find(o=>o.id===first.session.pendingSeller);
 const buyer=L.respond(s,first.session,{
  id:offer.id,mode:"fixed",bid:offer.ask,price:offer.ask*2,fallback:"walk"
 });
 const original=buyer.session.inventory[0];
 const oldPrice=original.price,nextPrice=Math.max(1,Math.floor(oldPrice*.8));
 const out=L.configure(s,buyer.session,{buy:[],prices:[{id:original.id,price:nextPrice}],list:[],repairs:[]});
 const current=out.inventory.find(x=>x.id===original.id);
 assert.equal(current.price,nextPrice);
 assert.equal(original.price,oldPrice,"original saved session is not overwritten");
 assert.ok(E.saleChance(original.type,original.grade,nextPrice,original.fair,s.day,s.reputation)>
  E.saleChance(original.type,original.grade,oldPrice,original.fair,s.day,s.reputation));
 const visitor=E.customerArrivals(s)[0];
 if(visitor){
   assert.ok(E.buyerChance(s,{...current,price:nextPrice},visitor)>
     E.buyerChance(s,{...current,price:oldPrice},visitor),
     "the live buyer scoring must use the discounted price");
 }
 assert.deepEqual(L.validate(s,out),out);
});
