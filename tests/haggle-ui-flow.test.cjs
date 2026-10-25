"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const E=require("../src/shop.js"),T=require("../src/time.js"),L=require("../src/live.js");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
const IDS=["day","cash","stock","sold","offers","inventory","budget","openBtn","report","history","resetBtn",
"exportBtn","importBtn","importFile","equipmentUpgrade","equipmentLevel","visitorSchedule","openingScreen",
"gameShell","openingModeEasy","openingModeNormal","openingModeHard","openingError","startGameBtn",
"financeSummary","repayAmount","repayBtn","repayAllBtn","repayMessage","restoreBtn","restoreFromOpeningBtn",
"gameClock","clockProgress","clockBar","timeLabel","pauseBtn","fastForwardBtn","timeMessage",
"monthPanel","monthSummary","monthRepayment","monthPayBtn","monthSkipBtn","monthMessage",
"sellerRespondBtn","sellerSkipBtn","warehousePageLabel","warehousePrev","warehouseNext","workbench",
"toolShop","applyPlanBtn","visitorLog","soundToggleBtn",
"shopMapTitle","sceneStatus","sceneClock","sceneSeller","sceneWorkshop","sceneShelf","sceneVisitors"];
function boot(savedRaw,{mode="easy",start=true,timeRaw=null}={}){
 const nodes={},listeners={},storage=new Map(),key="used-item-shop:save:v1";
 if(savedRaw!==undefined)storage.set(key,savedRaw);
 if(timeRaw!==null)storage.set("used-item-shop:active-time:v1",timeRaw);
 class Element{
  constructor(tag="div"){this.tag=tag;this.children=[];this._text="";this.dataset={};this.listeners={};this.value="";
   this.checked=false;this.disabled=false;this.className="";this.files=[];this.classList={add:n=>this.className+=" "+n};}
  set textContent(v){this._text=String(v);this.children=[]}
  get textContent(){return this._text+this.children.map(v=>v.textContent??"").join("")}
  append(...x){this.children.push(...x)}
  prepend(...x){this.children.unshift(...x)}
  replaceChildren(...x){this._text="";this.children=x}
  addEventListener(type,fn){this.listeners[type]=fn}
  setAttribute(key,value){this[key]=value}
  scrollIntoView(){}
  click(){if(!this.disabled)this.listeners.click?.({target:this})}
 }
 for(const id of IDS)nodes[id]=new Element(id);
 nodes.shopMapTitle.closest=()=>nodes.shopMapTitle; // shop-map ancestor in minimal VM DOM
 function allNodes(){const out=[];const visit=n=>{out.push(n);for(const c of n.children)visit(c)};for(const v of Object.values(nodes))visit(v);return out;}
 function queryAll(selector){
  const match=/^\[data-([a-z-]+)(?:="([^"]+)")?\]$/.exec(selector);
  if(!match)throw Error("Unexpected selector "+selector);
  const key=match[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  return allNodes().filter(n=>Object.hasOwn(n.dataset,key)&&(match[2]===undefined||String(n.dataset[key])===match[2]));
 }
 const document={hidden:false,getElementById:id=>nodes[id],createElement:tag=>new Element(tag),
  createTextNode:v=>{const n=new Element("text");n.textContent=v;return n},
  addEventListener:(type,fn)=>listeners[type]=fn,querySelectorAll:queryAll,
  querySelector:s=>queryAll(s)[0]??null,body:{append(){}}};
 let now=0,ticker=null,lastDownload=null;
 const URL={createObjectURL(blob){lastDownload=blob.parts.join("");return "blob:local"},revokeObjectURL(){}};
 const Blob=class{constructor(parts){this.parts=parts}};
 const context={window:{UsedItemShop:E,ShopTime:T,ShopLive:L,addEventListener(){}},
   document,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
   performance:{now:()=>now},setInterval:fn=>{ticker=fn;return 5},clearInterval:()=>{ticker=null},
   setTimeout:()=>{},alert:()=>{},confirm:()=>true,Blob,URL};
 vm.runInNewContext(source,context,{filename:"src/app.js"});
 listeners.DOMContentLoaded();
 if(start&&savedRaw===undefined){
  nodes.openingModeEasy.checked=mode==="easy";
  nodes.openingModeNormal.checked=mode==="normal";
  nodes.openingModeHard.checked=mode==="hard";
  nodes.startGameBtn.click();
 }
 return {nodes,storage,key,queryAll,lastDownload:()=>lastDownload,
  simulate(ms){let left=ms;while(left>0&&ticker){const dt=Math.min(left,5000);left-=dt;now+=dt;ticker();}},
  current(){return JSON.parse(storage.get(key))},
  seller(){return this.current().liveSession?.pendingSeller},
  chooseSeller(mode="fixed",bid=null){
   const offer=E.offers(this.current()).find(x=>x.id===this.seller());
   assert.ok(offer,"seller must be present");
   const box=nodes.offers.children[0],check=box.children.at(-1).children[0];check.checked=true;
   const m=queryAll("[data-offer-mode]")[0];m.value=mode;m.listeners.change?.();
   queryAll("[data-offer-bid]")[0].value=String(bid??offer.ask);
   queryAll("[data-offer-fallback]")[0].value="walk";
   nodes.sellerRespondBtn.click();
  },
  advanceToNextSeller(){
   if(!ticker)nodes.openBtn.click();
   const target=L.schedule(this.current()).find(x=>x.kind==="seller"&&x.minute>=600)?.minute;
   this.simulate(900000); // auto-pauses on the first seller, or closes when no seller
   assert.ok(this.seller(),"expected an active seller");
  },
  skip(){nodes.fastForwardBtn.click()}
 };
}
test("new game needs a one-time mode choice and saves without a mode-change control",()=>{
 const opening=boot(undefined,{start:false});
 assert.equal(opening.storage.has(opening.key),false);
 assert.equal(opening.nodes.openingScreen.hidden,false);
 assert.equal(opening.nodes.gameShell.hidden,true);
 const ui=boot(undefined,{mode:"hard"});
 assert.equal(ui.current().finance.mode,"hard");
 assert.equal(ui.nodes.openingScreen.hidden,true);
 assert.equal(ui.nodes.gameShell.hidden,false);
});
test("skipping at 10:00 removes every visitor and creates no transactions",()=>{
 const ui=boot(undefined,{mode:"normal"}),previous=ui.current(),expected=L.schedule(previous).length;
 ui.skip();const s=ui.current();
 assert.equal(s.day,2);
 assert.equal(s.cash,previous.cash-E.RENT);
 assert.equal(s.history[0].sold,0);
 assert.equal(s.lastReport.skippedVisitors,expected);
 assert.equal(s.lastReport.customerCount,0);
});
test("Poisson visitor reaches store at a saved hour and shop auto-pauses for negotiation",()=>{
 const ui=boot(undefined,{mode:"easy"});
 ui.advanceToNextSeller();
 const s=ui.current(),pending=s.liveSession.pendingSeller;
 assert.ok(E.offers(s).some(x=>x.id===pending));
 assert.equal(ui.nodes.pauseBtn.disabled,true);
 assert.equal(ui.nodes.sellerRespondBtn.disabled,false);
 assert.match(ui.nodes.timeMessage.textContent,/買取希望者/);
 assert.ok(ui.nodes.offers.textContent.includes("売り手の希望額"));
});
test("accepting an arrived seller purchases once, then skip preserves that warehouse stock",()=>{
 const ui=boot();ui.advanceToNextSeller();
 const offer=E.offers(ui.current()).find(x=>x.id===ui.seller());
 ui.chooseSeller("fixed");
 const after=ui.current();
 assert.equal(after.liveSession.pendingSeller,null);
 assert.equal(after.liveSession.inventory.length,1);
 assert.equal(after.liveSession.inventory[0].zone,"warehouse");
 assert.equal(after.liveSession.procurement,offer.ask);
 ui.skip();const saved=ui.current();
 assert.equal(saved.day,2);
 assert.equal(saved.cash,700000-offer.ask-E.RENT);
 assert.equal(saved.inventory[0].zone,"warehouse");
 assert.equal(saved.lastReport.bought,1);
 assert.equal(saved.lastReport.sold,0);
});
test("declining a seller then skipping does not purchase or fabricate a sale",()=>{
 const ui=boot();ui.advanceToNextSeller();
 ui.nodes.sellerSkipBtn.click();ui.skip();
 assert.equal(ui.current().lastReport.bought,0);
 assert.equal(ui.current().lastReport.revenue,0);
 assert.equal(ui.current().cash,700000-E.RENT);
});
test("paused live progress survives restart and seller encounter is not processed twice",()=>{
 const ui=boot();ui.advanceToNextSeller();
 const old=ui.storage.get(ui.key),timeRaw=ui.storage.get("used-item-shop:active-time:v1");
 const reload=boot(old,{timeRaw});
 assert.equal(reload.seller(),ui.seller());
 assert.equal(reload.nodes.openBtn.disabled,true);
 reload.chooseSeller();
 const next=reload.current();
 assert.equal(next.liveSession.bought,1);
 assert.equal(next.liveSession.cursor,ui.current().liveSession.cursor+1);
});
test("warehouse displays nine slots per page and last page can be opened",()=>{
 const old=E.initial(25);
 old.inventory=Array.from({length:12},(_,i)=>({id:101+i,type:"camera",grade:"B",fair:26000,
  cost:10000,price:29000,zone:"warehouse",ageDays:0,wearDays:0}));
 const ui=boot(JSON.stringify(old));
 assert.match(ui.nodes.warehousePageLabel.textContent,/1 \/ 2/);
 assert.equal(ui.queryAll("[data-stock-price]").length,9);
 ui.nodes.warehouseNext.click();
 assert.match(ui.nodes.warehousePageLabel.textContent,/2 \/ 2/);
 assert.equal(ui.queryAll("[data-stock-price]").length,3);
});
test("repair workbench accepts purchased tools and updates visible dust and progress",()=>{
 let state;
 for(let seed=1;seed<=24;seed++){
  const old=E.startGame("normal",seed);
  const next=E.advance(old,{buy:[{id:E.offers(old)[0].id,price:30000}],prices:[]}).state;
  if(next.inventory[0]?.grade!=="A"){state=next;break;}
 }
 assert.ok(state);
 const live=L.configure(state,L.initial(state),{repairs:[state.inventory[0].id]});
 state={...state,liveSession:live};
 const ui=boot(JSON.stringify(state));
 assert.match(ui.nodes.workbench.textContent,/整備進捗 0%/);
 const root=ui.nodes.toolShop;
 const tools=root.children[1]; // heading, controls
 const brush=tools.children[0];
 brush.click();
 assert.equal(ui.current().liveSession.inventory[0].repairProgress,18);
 assert.match(ui.nodes.workbench.textContent,/整備進捗 18%/);
});
test("mode can change only after reset; prior mode and session can be restored",()=>{
 const ui=boot(undefined,{mode:"hard"});
 ui.nodes.resetBtn.click();
 assert.equal(ui.storage.has(ui.key),false);
 assert.equal(ui.nodes.openingScreen.hidden,false);
 ui.nodes.openingModeEasy.checked=false;ui.nodes.openingModeHard.checked=false;
 ui.nodes.openingModeNormal.checked=true;ui.nodes.startGameBtn.click();
 assert.equal(ui.current().finance.mode,"normal");
 ui.nodes.restoreBtn.click();
 assert.equal(ui.current().finance.mode,"hard");
});
test("bad imported legacy save cannot be overwritten on opening",()=>{
 const raw="{incomplete-json";
 const ui=boot(raw);
 assert.equal(ui.storage.get(ui.key),raw);
 ui.skip();
 assert.equal(ui.storage.get(ui.key),raw);
 assert.equal(ui.nodes.openBtn.disabled,true);
});

test("sound effects are opt-in, persist mode, and work without audio hardware",()=>{
 const ui=boot();
 assert.equal(ui.current().settings,undefined);
 assert.match(ui.nodes.soundToggleBtn.textContent,/OFF/);
 ui.nodes.soundToggleBtn.click();
 assert.equal(ui.current().settings.soundEnabled,true);
 assert.match(ui.nodes.soundToggleBtn.textContent,/ON/);
 const restored=boot(ui.storage.get(ui.key));
 assert.equal(restored.current().settings.soundEnabled,true);
 restored.nodes.soundToggleBtn.click();
 assert.equal(restored.current().settings.soundEnabled,false);
});
async function uploadJson(ui,payload){
 const raw=JSON.stringify(payload),file={size:raw.length,text:async()=>raw};
 const target={files:[file],value:"data.json"};
 ui.nodes.importFile.listeners.change({target});
 await new Promise(resolve=>setImmediate(resolve)); // allow async File.text and validation
}
test("malformed imported clock must not overwrite current game, backup, or later progress",async()=>{
 const ui=boot(undefined,{mode:"normal"});
 ui.skip();
 const original=ui.storage.get(ui.key);
 const backupKey="used-item-shop:previous-run:v1",backup=ui.storage.get(backupKey)??null;
 const incoming=E.startGame("hard",23);
 await uploadJson(ui,{schema:E.VERSION,state:incoming,clock:{day:99,elapsedMs:0,paused:true,durationMs:T.DAY_MS}});
 assert.equal(ui.storage.get(ui.key),original,"current save is preserved");
 assert.equal(ui.storage.get(backupKey)??null,backup,"invalid data must not disturb a prior backup");
 assert.equal(ui.current().finance.mode,"normal");
 ui.skip();
 assert.equal(ui.current().day,3,"in-memory game must remain playable after rejected import");
});
test("valid save import restores its daily report and backs up the previous save",async()=>{
 const incoming=boot(undefined,{mode:"hard"});
 incoming.skip();
 const imported=incoming.current();
 const ui=boot(undefined,{mode:"normal"});
 ui.skip();
 const before=ui.storage.get(ui.key);
 await uploadJson(ui,{schema:E.VERSION,state:imported,clock:T.initial(imported.day)});
 assert.equal(ui.current().finance.mode,"hard");
 assert.equal(JSON.stringify(ui.current()),JSON.stringify(imported));
 assert.equal(ui.storage.get("used-item-shop:previous-run:v1"),before,"original game is recoverable");
 assert.match(ui.nodes.report.textContent,/今日の売上/,"report must remain visible after import");
 assert.doesNotMatch(ui.nodes.report.textContent,/営業後に、売れた品物/);
});
