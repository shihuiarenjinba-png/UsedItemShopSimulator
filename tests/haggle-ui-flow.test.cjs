"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const E=require("../src/shop.js"),T=require("../src/time.js");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
const ID_LIST=["day","cash","stock","sold","offers","inventory","budget","openBtn","report","history","resetBtn","exportBtn","importBtn","importFile","equipmentUpgrade","equipmentLevel","visitorSchedule","openingScreen","gameShell","openingModeEasy","openingModeNormal","openingModeHard","openingError","startGameBtn","financeSummary","repayAmount","repayBtn","repayAllBtn","repayMessage","restoreBtn","restoreFromOpeningBtn","gameClock","clockProgress","clockBar","timeLabel","pauseBtn","fastForwardBtn","timeMessage","monthPanel","monthSummary","monthRepayment","monthPayBtn","monthSkipBtn","monthMessage"];
function boot(savedRaw,{mode="easy",start=true,timeRaw=null}={}){
 const nodes={},listeners={},storage=new Map(),key="used-item-shop:save:v1";
 if(savedRaw!==undefined)storage.set(key,savedRaw);
 if(timeRaw!==null)storage.set("used-item-shop:active-time:v1",timeRaw);
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
 let now=0,ticker=null;const pageListeners={};
 const context={window:{UsedItemShop:E,ShopTime:T,addEventListener:(kind,fn)=>{pageListeners[kind]=fn;}},document,
 performance:{now:()=>now},
 setInterval:(fn)=>{ticker=fn;return 123},clearInterval:()=>{ticker=null},localStorage:{
  getItem:id=>storage.get(id)??null,
  setItem:(id,v)=>storage.set(id,v),removeItem:id=>storage.delete(id)
 },Blob,URL,setTimeout:()=>{},alert:()=>{},confirm:()=>true};
 vm.runInNewContext(source,context,{filename:"src/app.js"});
 listeners.DOMContentLoaded();
 if(start&&savedRaw===undefined){
  nodes.openingModeEasy.checked=mode==="easy";
  nodes.openingModeNormal.checked=mode==="normal";
  nodes.openingModeHard.checked=mode==="hard";
  nodes.startGameBtn.click();
 }
 return {nodes,storage,key,lastDownload:()=>lastDownload,queryAll,
  simulate(ms){now+=ms;if(ticker)ticker()},pause(){nodes.pauseBtn.click()},
  chooseFirst(bid,mode="fixed",fallback="walk"){
   const offer=nodes.offers.children[0],checkbox=offer.children.at(-1).children[0];checkbox.checked=true;
   const control=queryAll("[data-offer-mode]")[0];control.value=mode;control.listeners.change();
   queryAll("[data-offer-bid]")[0].value=String(bid);
   queryAll("[data-offer-fallback]")[0].value=fallback;
   listeners.change({target:{matches:()=>true}});
  },run(){nodes.openBtn.click();nodes.fastForwardBtn.click();}};
}
test("customer may bid the ask and buy from the three-step GUI",()=>{
 const ui=boot(),ask=E.offers(E.initial())[0].ask;
 ui.chooseFirst(ask);
 assert.match(ui.nodes.budget.textContent,/必要資金の上限/);
 ui.run();
 const saved=JSON.parse(ui.storage.get(ui.key));
 assert.equal(saved.day,2);
 assert.equal(saved.history.length,1);
 assert.match(ui.nodes.report.textContent,/不成立 0件/);
 assert.match(ui.nodes.report.textContent,/今日の利益/);
});
test("low-bid seller refusal is shown clearly and never debits the purchase price",()=>{
 const ui=boot();
 ui.chooseFirst(100,"negotiate");
 ui.run();
 const saved=JSON.parse(ui.storage.get(ui.key));
 assert.equal(saved.day,2);
 assert.equal(saved.inventory.length,0);
 assert.equal(saved.cash,E.initial().cash-E.RENT);
 assert.match(ui.nodes.report.textContent,/不成立 1件/);
 assert.match(ui.nodes.report.textContent,/購入できませんでした/);
});
test("changing a purchase bid only updates the budget until opening the shop",()=>{
 const ui=boot(),before=ui.storage.get(ui.key),ask=E.offers(E.initial())[0].ask;
 ui.chooseFirst(ask);
 const costAtAsk=ui.nodes.budget.textContent;
 ui.chooseFirst(100,"negotiate");
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

test("player chooses counteroffer explicitly; it is never silently enabled",()=>{
 const ui=boot(),bid=100;
 ui.chooseFirst(bid,"negotiate","ask");
 assert.match(ui.nodes.budget.textContent,/必要資金の上限/);
 ui.run();
 const saved=JSON.parse(ui.storage.get(ui.key));
 assert.equal(saved.day,2);
 assert.match(ui.nodes.report.textContent,/不成立 0件/);
});

test("purchased goods appear in warehouse with a manual listing checkbox",()=>{
 const ui=boot(),ask=E.offers(E.initial())[0].ask;
 ui.chooseFirst(ask);
 ui.run();
 assert.match(ui.nodes.inventory.textContent,/倉庫/);
 assert.equal(ui.queryAll("[data-list-id]").length,1);
 assert.match(ui.nodes.visitorSchedule.textContent,/来店客/);
 assert.match(ui.nodes.report.textContent,/来店者/);
 const checkbox=ui.queryAll("[data-list-id]")[0];checkbox.checked=true;
 const before=ui.storage.get(ui.key);
 assert.equal(ui.storage.get(ui.key),before);
 ui.run();
 assert.equal(JSON.parse(ui.storage.get(ui.key)).day,3);
});
test("explicit machine upgrade charges cash and exposes repaired workbench capacity",()=>{
 const ui=boot(),initial=E.initial();
 ui.nodes.equipmentUpgrade.checked=true;
 ui.run();
 const state=JSON.parse(ui.storage.get(ui.key));
 assert.equal(state.equipmentLevel,2);
 assert.equal(state.cash,initial.cash-E.RENT-E.EQUIPMENT_UPGRADE_COST);
 assert.match(ui.nodes.equipmentLevel.textContent,/2 \/ 2/);
});

test("opening screen blocks play and offers three modes before any save exists",()=>{
 const ui=boot(undefined,{start:false});
 assert.equal(ui.storage.has(ui.key),false);
 assert.equal(ui.nodes.openingScreen.hidden,false);
 assert.equal(ui.nodes.gameShell.hidden,true);
 assert.equal(ui.nodes.openBtn.disabled,true);
});
test("selected HARD mode survives reload with the correct debt and without mode cards",()=>{
 const ui=boot(undefined,{mode:"hard"});
 const raw=ui.storage.get(ui.key),s=JSON.parse(raw);
 assert.equal(s.finance.mode,"hard");
 assert.equal(s.finance.principal,700000);
 assert.equal(ui.nodes.openingScreen.hidden,true);
 assert.equal(ui.nodes.gameShell.hidden,false);
 const reloaded=boot(raw);
 assert.equal(reloaded.nodes.openingScreen.hidden,true);
 assert.match(reloaded.nodes.financeSummary.textContent,/利息付きの借金/);
 assert.equal(JSON.parse(reloaded.storage.get(reloaded.key)).finance.mode,"hard");
});
test("repayment buttons preserve mode and are reversible only through a new saved game",()=>{
 const ui=boot(undefined,{mode:"normal"});
 ui.nodes.repayAmount.value="50000";
 ui.nodes.repayBtn.click();
 let s=JSON.parse(ui.storage.get(ui.key));
 assert.equal(s.finance.mode,"normal");
 assert.equal(s.finance.principal,650000);
 assert.equal(s.cash,650000);
 assert.match(ui.nodes.repayMessage.textContent,/返済/);
 const restored=boot(ui.storage.get(ui.key));
 assert.equal(JSON.parse(restored.storage.get(restored.key)).finance.principal,650000);
 assert.equal(restored.nodes.openingScreen.hidden,true);
});
test("reset requires a new funding choice, keeps a backup and never auto-starts another mode",()=>{
 const ui=boot(undefined,{mode:"hard"});
 ui.nodes.repayAmount.value="50000";ui.nodes.repayBtn.click();
 const old=ui.storage.get(ui.key);
 ui.nodes.resetBtn.click();
 assert.equal(ui.storage.has(ui.key),false);
 assert.equal(ui.storage.get("used-item-shop:previous-run:v1"),old);
 assert.equal(ui.nodes.openingScreen.hidden,false);
 assert.equal(ui.nodes.gameShell.hidden,true);
 assert.equal(ui.nodes.openBtn.disabled,true);
 ui.nodes.openingModeEasy.checked=false;
 ui.nodes.openingModeNormal.checked=true;
 ui.nodes.openingModeHard.checked=false;
 ui.nodes.startGameBtn.click();
 const fresh=JSON.parse(ui.storage.get(ui.key));
 assert.equal(fresh.finance.mode,"normal");
 assert.equal(fresh.finance.principal,700000);
 assert.equal(fresh.day,1);
 assert.equal(ui.nodes.openingScreen.hidden,true);
 assert.equal(ui.storage.get("used-item-shop:previous-run:v1"),old);
 assert.equal(ui.nodes.restoreFromOpeningBtn.disabled,false);
 ui.nodes.restoreFromOpeningBtn.click();
 assert.equal(JSON.parse(ui.storage.get(ui.key)).finance.mode,"hard");
 assert.equal(JSON.parse(ui.storage.get(ui.key)).finance.principal,650000);
});
test("imported old saves remain debt-free, while malformed saves are not overwritten",()=>{
 const old=E.initial(6);
 const ui=boot(JSON.stringify(old));
 assert.equal(ui.nodes.openingScreen.hidden,true);
 assert.match(ui.nodes.financeSummary.textContent,/旧ルール/);
 assert.equal(JSON.parse(ui.storage.get(ui.key)).finance,undefined);
});

test("shop clock starts only on opening; pause freezes time and skip settles full sales day",()=>{
 const ui=boot(),before=ui.storage.get(ui.key);
 assert.match(ui.nodes.timeLabel.textContent,/10:00/);
 assert.equal(ui.nodes.clockProgress.textContent,"0%");
 ui.nodes.openBtn.click();
 assert.equal(ui.nodes.openBtn.disabled,true);
 assert.equal(ui.nodes.pauseBtn.disabled,false);
 assert.equal(ui.storage.get(ui.key),before,"time progression must not mutate financial state");
 ui.simulate(5000);
 const progressed=JSON.parse(ui.storage.get("used-item-shop:active-time:v1"));
 assert.equal(progressed.elapsedMs,5000);
 assert.equal(progressed.paused,false);
 ui.pause();
 const paused=JSON.parse(ui.storage.get("used-item-shop:active-time:v1"));
 assert.equal(paused.paused,true);
 ui.simulate(5000);
 assert.equal(JSON.parse(ui.storage.get("used-item-shop:active-time:v1")).elapsedMs,5000);
 ui.nodes.fastForwardBtn.click();
 assert.equal(JSON.parse(ui.storage.get(ui.key)).day,2);
 assert.equal(JSON.parse(ui.storage.get(ui.key)).history.length,1);
 assert.match(ui.nodes.timeLabel.textContent,/10:00/);
});
test("paused time survives reload without offline catch-up",()=>{
 const ui=boot(undefined,{mode:"normal"});
 ui.nodes.openBtn.click();
 ui.simulate(5000);ui.pause();
 const raw=ui.storage.get(ui.key),timeRaw=ui.storage.get("used-item-shop:active-time:v1");
 const again=boot(raw,{timeRaw});
 assert.equal(JSON.parse(again.storage.get("used-item-shop:active-time:v1")).elapsedMs,5000);
 assert.match(again.nodes.timeLabel.textContent,/10:02/);
 assert.equal(again.nodes.pauseBtn.disabled,true);
 assert.equal(JSON.parse(again.storage.get(again.key)).day,1);
});
test("month 1 report asks how much to repay; choosing zero unblocks the next day",()=>{
 let state=E.startGame("normal",21);
 for(let i=0;i<30;i++)state=E.advance(state,{buy:[],prices:[]}).state;
 const ui=boot(JSON.stringify(state));
 assert.equal(ui.nodes.monthPanel.hidden,false);
 assert.match(ui.nodes.monthSummary.textContent,/1か月目/);
 assert.match(ui.nodes.monthSummary.textContent,/家賃/);
 assert.equal(ui.nodes.openBtn.disabled,true);
 ui.nodes.monthSkipBtn.click();
 const next=JSON.parse(ui.storage.get(ui.key));
 assert.equal(next.pendingMonth,undefined);
 assert.equal(next.monthDecisions[0].amount,0);
 assert.equal(next.finance.principal,700000);
 assert.equal(ui.nodes.monthPanel.hidden,true);
 assert.equal(ui.nodes.openBtn.disabled,false);
});
test("month-end repayment is only made when player enters and confirms the amount",()=>{
 let state=E.startGame("hard",21);
 for(let i=0;i<30;i++)state=E.advance(state,{buy:[],prices:[]}).state;
 const ui=boot(JSON.stringify(state)),oldCash=state.cash;
 ui.nodes.monthRepayment.value="17000";
 ui.nodes.monthPayBtn.click();
 const next=JSON.parse(ui.storage.get(ui.key));
 assert.equal(next.cash,oldCash-17000);
 assert.equal(next.finance.interestDue,0);
 assert.equal(next.finance.principal,690000);
 assert.equal(next.monthDecisions[0].amount,17000);
 assert.equal(next.pendingMonth,undefined);
});
