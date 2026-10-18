"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8"),source=fs.readFileSync("src/shop-tabs.js","utf8");
const names=["home","buy","stock","repair","day","money","records"];
test("all seven actual game tabs have distinct corresponding panels and no duplicate IDs",()=>{
 for(const id of ["shopHomeStage","warehouseStage","inventoryStage","workshopStage","openDayStage","financeStage","recordsStage"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const name of names){assert.match(html,new RegExp('data-shop-tab="'+name+'"'));}
 for(const name of names){assert.match(html,new RegExp('data-shop-screen="'+name+'"'));}
 assert.match(html,/id="inventory"/);assert.match(html,/id="workbench"/);
 assert.match(html,/id="toolShop"/);assert.match(html,/id="applyPlanBtn"/);
 assert.equal((html.match(/id="applyPlanBtn"/g)||[]).length,1);
 assert.deepEqual([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).length,
    new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])).size);
 assert.ok(html.indexOf("src/app.js")<html.indexOf("src/shop-tabs.js"));
});
test("navigation selects only the proper station; repair, month settlement, and arriving seller are real views",()=>{
 const registry={};const listeners={};const tabNodes=[],screens=[];
 class Element{
  constructor(id="",dataset={}){this.id=id;this.dataset=dataset;this.hidden=false;this.disabled=false;this.tabIndex=0;this.attrs={};this.open=false;
    this.events={};this.classList={toggle:(k,on)=>{this.selected=on}};}
  setAttribute(k,v){this.attrs[k]=v}
  addEventListener(k,fn){this.events[k]=fn}
  scrollIntoView(){}
  focus(){this.focused=true}
  querySelector(){return {open:false}}
  closest(sel){if(sel==="[data-shop-tab]")return this.dataset.shopTab?this:null;
    if(sel==="[data-shop-open]")return this.dataset.shopOpen?this:null;
    if(sel==='a[href^="#"]')return this.href?this:null;
    if(sel==="[data-shop-screen]")return this.dataset.shopScreen?this:null;
    return null}
 }
 for(const m of html.matchAll(/<button[^>]*data-shop-tab="([^"]+)"[^>]*aria-controls="([^"]+)"/g)){
   const element=new Element("tab-"+m[1],{shopTab:m[1]});tabNodes.push(element);registry[element.id]=element;
 }
 for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]+data-shop-screen="([^"]+)"/g)){
   const element=new Element(m[1],{shopScreen:m[2]});screens.push(element);registry[element.id]=element;
 }
 for(const m of html.matchAll(/<[^>]+data-shop-screen="([^"]+)"[^>]+\bid="([^"]+)"/g)){
   if(registry[m[2]])continue;const element=new Element(m[2],{shopScreen:m[1]});screens.push(element);registry[element.id]=element;
 }
 registry.shopTabs=new Element("shopTabs");
 registry.monthPanel.hidden=true;registry.sellerRespondBtn=new Element("sellerRespondBtn");registry.sellerRespondBtn.disabled=true;
 registry.recordsStage.querySelector=()=>registry.recordsDetails;
 registry.recordsDetails={open:false};
 const doc={readyState:"loading",body:{dataset:{}},
  getElementById:id=>registry[id],
  querySelectorAll:sel=>sel==="#shopTabs [data-shop-tab]"?tabNodes:sel==="[data-shop-screen]"?screens:[],
  addEventListener:(k,f)=>listeners[k]=f};
 const window={};vm.runInNewContext(source,{window,document:doc});
 listeners.DOMContentLoaded();
 assert.equal(window.ShopScreens.current(),"home");
 const repair=tabNodes.find(x=>x.dataset.shopTab==="repair");
 registry.shopTabs.events.click({target:repair});
 assert.equal(window.ShopScreens.current(),"repair");
 assert.equal(registry.workshopStage.hidden,false);assert.equal(registry.inventoryStage.hidden,true);
 assert.equal(registry.workbench?.hidden,undefined);
 window.ShopScreens.update({month:true,seller:false});
 assert.equal(window.ShopScreens.current(),"money");assert.equal(registry.monthPanel.hidden,false);
 window.ShopScreens.update({month:false,seller:true});
 assert.equal(window.ShopScreens.current(),"buy");
 assert.equal(registry.warehouseStage.hidden,false);assert.equal(registry.workshopStage.hidden,true);
 window.ShopScreens.select("records");
 assert.equal(registry.recordsDetails.open,true);
 window.ShopScreens.select("stock");
 assert.equal(registry.inventoryStage.hidden,false);assert.equal(registry.workshopStage.hidden,true);
});
test("new tab system does not change engine rules or save-format keys",()=>{
 assert.doesNotMatch(source,/localStorage|\.cash\s*=|\.inventory\s*=|new XMLHttpRequest|\bfetch\s*\(/);
 assert.match(fs.readFileSync("src/app.js","utf8"),/window\.ShopScreens\?\.update\(/);
 assert.match(html,/href="#workshopStage"/);
 assert.match(html,/href="#inventoryStage"/);
});