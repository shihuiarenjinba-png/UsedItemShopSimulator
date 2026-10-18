"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/shop.js"),L=require("../src/live.js");
test("new repair tab uses real seller → warehouse → workbench → owned tool → sales shelf state",()=>{
 let repaired=0;
 for(let seed=1;seed<=40;seed++){
  const base=E.startGame("normal",seed);let live=L.initial(base);
  for(let n=0;n<7;n++){
   const arrival=L.until(base,live,1140);live=arrival.session;
   if(!arrival.interrupted)break;
   const seller=E.offers(base).find(o=>o.id===live.pendingSeller);
   if(seller.grade==="A"){live=L.respond(base,live,null).session;continue;}
   live=L.respond(base,live,{mode:"fixed",bid:seller.ask,price:seller.defaultPrice}).session;
   const id=live.inventory.at(-1).id;
   assert.equal(live.inventory.at(-1).zone,"warehouse");
   live=L.configure(base,live,{repairs:[id]});
   assert.equal(live.inventory.find(x=>x.id===id).zone,"workshop");
   live=L.workOn(base,live,id,"brush");
   assert.equal(live.inventory.find(x=>x.id===id).repairProgress,18);
   for(let x=0;x<6&&live.inventory.find(x=>x.id===id).zone==="workshop";x++)live=L.workOn(base,live,id,"brush");
   const fixed=live.inventory.find(x=>x.id===id);
   assert.equal(fixed.zone,"warehouse");
   assert.equal(fixed.repairProgress,100);
   live=L.configure(base,live,{list:[id]});
   assert.equal(live.inventory.find(x=>x.id===id).zone,"shelf");
   L.validate(base,live);repaired++;
   break;
  }
 }
 assert.ok(repaired>=30,"expected repairable seller on enough independent seeds: "+repaired);
});
