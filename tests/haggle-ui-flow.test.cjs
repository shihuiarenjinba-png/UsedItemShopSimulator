"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const E=require("../src/shop.js");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
const ID_LIST=["day","cash","stock","sold","offers","inventory","budget","openBtn","report","history","resetBtn","exportBtn","importBtn","importFile"];
function boot(savedRaw){
 const nodes={},listeners={},storage=new Map(),key="used-item-shop:save:v1";
 if(savedRaw!==undefined)storage.set(key,savedRaw);
 class Element{
  constructor(tag="div"){this.tag=tag;this.children=[];this._text="";this.dataset={};this.listeners={};this.value="";this.checked=false;this.disabled=false;this.className="";this.files=[];this.classList={add:name=>{this.className+=" "+name}};}
  set textContent(s){this._text=String(s);this.children=[]}
  get textContent(){return this._text+this.children.map(x=>x.textContent??"").join("")}
  append(...elements){this.children.push(...elements)}
  prepend(...elements){this.children.unshift(...elements)}
  replaceChildren(...elements){this._text="";this.children=elements}
  addEventListener(type,fn){this.listeners[type]=fn}
  setAttribute(name,value){this[name]=value}
  scrollIntoView(){}
  remove(){}
  click(){if(this.disabled)return;if(this.listeners.click)this.listeners.click({target:this})}
 }
 for(const id of ID_LIST)nodes[id]=new Element(id);
 function visit(node,all){all.push(node);for(const c of node.children)visit(c,all)}
 function queryAll(selector){
  const match=/^\[data-([a-z-]+)(?:="([^"]+)")?\]$/.exec(selector);
  if(!match)throw Error("Unexpected selector "+selector);
  const key=match[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  const all=[];for(const el of Object.values(nodes))visit(el,all);
  return all.filter(n=>Object.hasOwn(n.dataset,key)&&(match[2]===undefined||String(n.dataset[key])===match[2]));
 }
 const document={
  getElementById:id=>nodes[id],
  createElement:tag=>new Element(tag),
  createTextNode:value=>{const node=new Element("text");node.textContent=value;return node},
  addEventListener:(type,fn)=>{listeners[type]=fn},
  querySelectorAll:queryAll,
  querySelector:selector=>queryAll(selector)[0]??null,
  body:{append(){}}
 };
 let lastDownload=null;
 const Blob=class {constructor(parts){this.parts=parts}};
 const URL={createObjectURL(blob){lastDownload=blob.parts.join("");return "blob:test"},revokeObjectURL(){}};
 const context={window:{UsedItemShop:E},document,localStorage:{
  getItem:id=>storage.get(id)??null,
  setItem:(id,v)=>storage.set(id,v)
 },Blob,URL,setTimeout:()=>{},alert:()=>{},confirm:()=>true};
 vm.runInNewContext(source,context,{filename:"src/app.js"});
 listeners.DOMContentLoaded();
 return {nodes,storage,key,lastDownload:()=>lastDownload,queryAll,
  chooseFirst(bid){const offer=nodes.offers.children[0],checkbox=offer.children.at(-1).children[0];checkbox.checked=true;
   queryAll("[data-offer-bid]")[0].value=String(bid);
   listeners.change({target:{matches:()=>true}});
  },run(){nodes.openBtn.click();}};
}
test("customer may bid the ask and buy from the three-step GUI",()=>{
 const ui=boot(),ask=E.offers(E.initial())[0].ask;
 ui.chooseFirst(ask);
 assert.match(ui.nodes.budget.textContent,/仕入れ提示額の上限/);
 ui.run();
 const saved=JSON.parse(ui.storage.get(ui.key));
 assert.equal(saved.day,2);
 assert.equal(saved.history.length,1);
 assert.match(ui.nodes.report.textContent,/不成立 0件/);
 assert.match(ui.nodes.report.textContent,/今日の利益/);
});
test("low-bid seller refusal is shown clearly and never debits the purchase price",()=>{
 const ui=boot();
 ui.chooseFirst(100);
 ui.run();
 const saved=JSON.parse(ui.storage.get(ui.key));
 assert.equal(saved.day,2);
 assert.equal(saved.inventory.length,0);
 assert.equal(saved.cash,E.initial().cash-E.RENT);
 assert.match(ui.nodes.report.textContent,/不成立 1件/);
 assert.match(ui.nodes.report.textContent,/断られました/);
});
test("changing a purchase bid only updates the budget until opening the shop",()=>{
 const ui=boot(),before=ui.storage.get(ui.key),ask=E.offers(E.initial())[0].ask;
 ui.chooseFirst(ask);
 const costAtAsk=ui.nodes.budget.textContent;
 ui.chooseFirst(100);
 const costAtDiscount=ui.nodes.budget.textContent;
 assert.notEqual(costAtAsk,costAtDiscount);
 assert.equal(ui.storage.get(ui.key),before);
});
test("corrupted prior save is not replaced by showing a negotiation screen",()=>{
 const original="{broken save";
 const ui=boot(original);
 assert.equal(ui.storage.get(ui.key),original);
 assert.equal(ui.nodes.openBtn.disabled,true);
 ui.run();
 assert.equal(ui.storage.get(ui.key),original);
});
