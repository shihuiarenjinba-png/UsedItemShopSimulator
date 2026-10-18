/* Real-time visitor events. All trade outcomes are deterministic for the saved day/seed. */
(function(root,factory){
 const api=factory(typeof module==="object"&&module.exports?require("./shop.js"):root.UsedItemShop);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.ShopLive=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(E){
 "use strict";
 const OPEN=600,CLOSE=1140,MAX=E.CAPACITY,TOOLS=Object.freeze([
  {id:"brush",name:"清掃ブラシ",icon:"🖌️",price:0,gain:18},
  {id:"driver",name:"精密ドライバー",icon:"🪛",price:4800,gain:27},
  {id:"cleaner",name:"接点クリーナー",icon:"🧴",price:2600,gain:24},
  {id:"solder",name:"はんだごて",icon:"🔧",price:9800,gain:38}
 ]);
 const copy=v=>JSON.parse(JSON.stringify(v));
 const check=(cond,msg)=>{if(!cond)throw Error(msg)};
 const whole=(n,lo,hi,msg)=>{check(Number.isSafeInteger(n)&&n>=lo&&n<=hi,msg);return n};
 const minutes=hhmm=>Number(hhmm.slice(0,2))*60+Number(hhmm.slice(3));
 const timeString=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
 function schedule(base){
  const state=E.validate(base);
  const sellers=E.offers(state).map(o=>({key:"s"+o.id,kind:"seller",minute:minutes(o.arrival),id:o.id}));
  const buyers=E.customerArrivals(state).map(o=>({key:"b"+o.id,kind:"buyer",minute:minutes(o.arrival),id:o.id}));
  return [...sellers,...buyers].sort((a,b)=>a.minute-b.minute||a.key.localeCompare(b.key));
 }
 function initial(base){
  const state=E.validate(base);
  check(state.day<=180&&!state.pendingMonth,"営業できる日ではありません。");
  const inv=state.inventory.map(p=>{
   if(p.zone==="workshop"&&p.repairProgress===undefined&&p.repairReadyDay<=state.day){const {repairReadyDay,...r}=p;return {...r,zone:"warehouse"};}
   return copy(p);
  });
  return {version:1,day:state.day,inventory:inv,cash:state.cash,cursor:0,minute:OPEN,
   pendingSeller:null,customers:[],negotiations:[],rejectedOffers:[],soldItems:[],
   logs:[],ownedTools:[...(state.ownedTools??["brush"])],equipmentLevel:state.equipmentLevel??1,
   revenue:0,cogs:0,procurement:0,repairSpending:0,equipmentCost:0,sold:0,bought:0,repaired:0,
   expectedSales:0,skipped:false};
 }
 function validate(base,input){
  E.validate(base);
  check(input&&input.version===1&&input.day===base.day,"営業途中のセーブが不正です。");
  whole(input.cursor,0,schedule(base).length,"来客の進行記録が不正です。");
  whole(input.minute,OPEN,CLOSE,"営業時間の記録が不正です。");
  whole(input.cash,0,1e10,"営業中の現金が不正です。");
  whole(input.equipmentLevel,1,2,"機材記録が不正です。");
  check(Array.isArray(input.inventory)&&input.inventory.length<=MAX&&Array.isArray(input.logs)&&
    Array.isArray(input.customers)&&Array.isArray(input.negotiations)&&
    Array.isArray(input.rejectedOffers)&&Array.isArray(input.soldItems)&&
    Array.isArray(input.ownedTools)&&!input.ownedTools.some(x=>!TOOLS.some(y=>y.id===x)),"来客・在庫履歴が不正です。");
  for(const k of ["revenue","cogs","procurement","repairSpending","equipmentCost","sold","bought","repaired"]){
   whole(input[k],0,1e10,"売買台帳が不正です。");
  }
  check(input.cash===base.cash-input.procurement-input.repairSpending-input.equipmentCost+input.revenue,
    "現金と売買台帳の金額が一致しません。");
  const seen=new Set();
  for(const i of input.inventory){
   check(i&&Number.isSafeInteger(i.id)&&!seen.has(i.id)&&E.TYPES[i.type]&&E.GRADES[i.grade],"営業中の在庫が不正です。");
   seen.add(i.id);whole(i.price,1,1000000,"売価が不正です。");whole(i.cost,1,1000000,"原価が不正です。");
   check(["shelf","warehouse","workshop"].includes(i.zone??"shelf"),"在庫の場所が不正です。");
   if(i.repairProgress!==undefined)whole(i.repairProgress,0,100,"修理進捗が不正です。");
  }
  check(input.inventory.filter(x=>(x.zone??"shelf")==="shelf").length<=E.SHELF_CAPACITY,"売場が満杯です。");
  check(input.inventory.filter(x=>x.zone==="workshop").length<=input.equipmentLevel,"修理台の数を超えています。");
  check(new Set(input.ownedTools).size===input.ownedTools.length,"同じ工具の記録が重複しています。");
  const next=schedule(base)[input.cursor];
  check(input.pendingSeller===null||(next&&next.kind==="seller"&&next.id===input.pendingSeller),"保留中の買取が不正です。");
  return copy(input);
 }
 function visitBuyer(base,s,record){
  const visitor=E.customerArrivals(base).find(x=>x.id===record.id);
  const eligible=s.inventory.filter(x=>(x.zone??"shelf")==="shelf");
  const ranked=eligible.map(item=>({
   item,chance:E.buyerChance(base,item,visitor)*(item.repairProgress===undefined?1:.7+.3*item.repairProgress/100),
   preference:E.random(base.seed,base.day,5000+visitor.id*100+item.id)
  })).sort((a,b)=>b.chance*(1-b.preference/4)-a.chance*(1-a.preference/4));
  const picked=ranked[0];
  if(!picked){s.customers.push({...visitor,bought:false});s.logs.push(visitor.arrival+" "+visitor.name+"：売場に合う品物がありません");return;}
  const chance=Math.min(.92,picked.chance);
  s.expectedSales+=chance;
  const sold=E.random(base.seed,base.day,6000+visitor.id*100+picked.item.id)<chance;
  s.customers.push({...visitor,bought:sold,product:sold?E.TYPES[picked.item.type].name:null});
  if(sold){
   s.inventory=s.inventory.filter(x=>x.id!==picked.item.id);
   s.cash+=picked.item.price;s.revenue+=picked.item.price;s.cogs+=picked.item.cost;s.sold++;
   s.soldItems.push({name:E.TYPES[picked.item.type].name,price:picked.item.price,profit:picked.item.price-picked.item.cost});
   s.logs.push(visitor.arrival+" "+visitor.icon+" "+visitor.name+"："+E.TYPES[picked.item.type].name+"を"+picked.item.price.toLocaleString()+"円で購入");
  }else s.logs.push(visitor.arrival+" "+visitor.icon+" "+visitor.name+"：今回は購入せず");
 }
 function until(base,raw,targetMinute){
  const s=validate(base,raw);whole(targetMinute,OPEN,CLOSE,"目標時刻が不正です。");
  check(targetMinute>=s.minute,"営業時計を巻き戻せません。");
  if(s.pendingSeller!==null)return {session:s,interrupted:true,minute:s.minute};
  const events=schedule(base);
  while(s.cursor<events.length&&events[s.cursor].minute<=targetMinute){
   const event=events[s.cursor];s.minute=event.minute;
   if(event.kind==="seller"){
    s.pendingSeller=event.id;
    const seller=E.offers(base).find(x=>x.id===event.id);
    s.logs.push(seller.arrival+" "+seller.sellerIcon+" "+seller.name+"の買取希望者が来店");
    return {session:s,interrupted:true,minute:event.minute};
   }
   visitBuyer(base,s,event);s.cursor++;
  }
  s.minute=targetMinute;
  return {session:s,interrupted:false,minute:s.minute};
 }
 function respond(base,raw,choice=null){
  const s=validate(base,raw);check(s.pendingSeller!==null,"今、対応中の買取希望者はいません。");
  const offer=E.offers(base).find(x=>x.id===s.pendingSeller);
  let action=null;
  if(choice!==null){
   const mode=choice.mode??"fixed",fallback=choice.fallback??"walk";
   check(["fixed","negotiate"].includes(mode)&&Object.hasOwn(E.FALLBACKS,fallback),"買取方法が不正です。");
   const bid=whole(Number(choice.bid??offer.ask),100,offer.ask,"買取提示額が不正です。");
   const price=whole(Number(choice.price),1,1000000,"店頭価格が不正です。");
   const probability=mode==="fixed"?1:E.offerProbability(offer.ask,bid,offer.seller);
   const accepted=mode==="fixed"||E.random(base.seed,base.day,600+offer.id)<probability;
   const cost=accepted?(mode==="fixed"?offer.ask:bid):E.counterPrice(offer.ask,fallback);
   check(s.inventory.length+(cost?1:0)<=MAX,"倉庫が満杯で商品を買い取れません。");
   check(s.cash-cost>=E.RENT,"家賃のための現金が不足しています。");
   action={id:offer.id,name:offer.name,mode,bid,ask:offer.ask,probability,accepted,fallback,cost};
   s.negotiations.push(action);
   if(cost){
    s.cash-=cost;s.procurement+=cost;s.bought++;
    s.inventory.push({...offer,cost,price,ageDays:0,wearDays:0,acquiredDay:base.day,zone:"warehouse"});
    s.logs.push(offer.arrival+" "+offer.name+"："+cost.toLocaleString()+"円で買取成立（倉庫へ）");
   }else{
    s.rejectedOffers.push({id:offer.id,name:offer.name,bid,ask:offer.ask});
    s.logs.push(offer.arrival+" "+offer.name+"：交渉が不成立");
   }
  }else s.logs.push(offer.arrival+" "+offer.name+"：購入せずに見送り");
  s.cursor++;s.pendingSeller=null;
  return {session:s,action};
 }
 function configure(base,raw,plan){
  const s=validate(base,raw);
  check(plan&&typeof plan==="object","変更する内容が不正です。");
  const changes=plan.prices??[],list=plan.list??[],repairs=plan.repairs??[];
  check(Array.isArray(changes)&&Array.isArray(list)&&Array.isArray(repairs),"在庫の指示が不正です。");
  check(new Set(list).size===list.length&&new Set(repairs).size===repairs.length,"同じ商品の操作が重複しています。");
  for(const p of changes){
   const item=s.inventory.find(x=>x.id===p.id);check(item,"値付け対象の在庫がありません。");
   item.price=whole(Number(p.price),1,1000000,"販売価格が不正です。");
  }
  const upgrade=plan.equipmentUpgrade===true;
  if(upgrade){
   check(s.equipmentLevel===1,"修理機材はすでに強化されています。");
   check(s.cash>=E.EQUIPMENT_UPGRADE_COST+E.RENT,"設備投資の資金が不足しています。");
   s.cash-=E.EQUIPMENT_UPGRADE_COST;s.equipmentCost+=E.EQUIPMENT_UPGRADE_COST;s.equipmentLevel=2;
   s.logs.push("修理設備を65,000円で増強");
  }
  const occupied=s.inventory.filter(x=>x.zone==="workshop").length;
  check(repairs.length+occupied<=s.equipmentLevel,"修理台の空きが足りません。");
  for(const id of repairs){
   const item=s.inventory.find(x=>x.id===id);
   check(item&&item.grade!=="A"&&item.zone!=="workshop","修理できない在庫です。");
   const cost=E.repairPrice(item,s.equipmentLevel);
   check(s.cash>=cost+E.RENT,"修理費・家賃のための現金が不足しています。");
   check(item.cost+cost<=1000000,"修理原価が上限を超えています。");
   s.cash-=cost;s.repairSpending+=cost;
   item.cost+=cost;item.zone="workshop";item.repairProgress=0;item.repairReadyDay=base.day+1;
   s.logs.push(E.TYPES[item.type].name+"を修理台へ移動（費用 "+cost.toLocaleString()+"円）");
  }
  for(const id of list){
   const item=s.inventory.find(x=>x.id===id);
   check(item&&item.zone==="warehouse","倉庫にない商品は売場へ出せません。");
   check(s.inventory.filter(x=>(x.zone??"shelf")==="shelf").length<E.SHELF_CAPACITY,"売場が満杯です。");
   item.zone="shelf";
   s.logs.push(E.TYPES[item.type].name+"を売場へ陳列");
  }
  return s;
 }
 function buyTool(base,raw,id){
  const s=validate(base,raw),tool=TOOLS.find(x=>x.id===id);
  check(tool,"指定された工具がありません。");
  check(!s.ownedTools.includes(id),"工具は購入済みです。");
  check(s.cash>=tool.price+E.RENT,"工具代と家賃を支払う現金がありません。");
  s.cash-=tool.price;s.equipmentCost+=tool.price;s.ownedTools.push(id);
  s.logs.push(tool.name+"を定価"+tool.price.toLocaleString()+"円で購入");
  return s;
 }
 function completeToolset(base,raw){
  let s=validate(base,raw);
  for(const tool of TOOLS)if(!s.ownedTools.includes(tool.id))s=buyTool(base,s,tool.id);
  return s;
 }
 function workOn(base,raw,id,toolId){
  const s=validate(base,raw),tool=TOOLS.find(x=>x.id===toolId);
  check(tool&&s.ownedTools.includes(toolId),"この工具を所有していません。");
  const item=s.inventory.find(x=>x.id===id);
  check(item&&item.zone==="workshop","修理台に商品がありません。");
  const progress=Math.min(100,(item.repairProgress??0)+tool.gain);
  item.repairProgress=progress;
  s.logs.push(tool.icon+" "+E.TYPES[item.type].name+"：修理進捗"+progress+"%");
  if(progress===100){
   const grade=item.grade==="C"?"B":item.grade==="B"?"A":"A";
   item.fair=Math.min(1000000,Math.max(1,Math.round(item.fair*E.GRADES[grade]/E.GRADES[item.grade])));
   item.grade=grade;item.wearDays=0;item.zone="warehouse";
   delete item.repairReadyDay;
   s.repaired++;
   s.logs.push(E.TYPES[item.type].name+"の整備完了。倉庫へ戻りました");
  }
  return s;
 }
 function stopRepair(base,raw,id){
  const s=validate(base,raw),item=s.inventory.find(x=>x.id===id);
  check(item&&item.zone==="workshop","途中販売できる修理品がありません。");
  item.zone="warehouse";delete item.repairReadyDay;
  s.logs.push(E.TYPES[item.type].name+"は"+(item.repairProgress??0)+"%整備した現状品として倉庫に戻しました");
  return s;
 }
 function finish(base,raw){
  const s=validate(base,raw);
  const skipped=Math.max(0,schedule(base).length-s.cursor);
  const inventory=s.inventory.map(x=>{
   const aged=E.ageItem(x);
   if(aged.zone==="workshop"&&aged.repairProgress!==undefined&&aged.repairProgress<100)
    aged.repairReadyDay=base.day+2; // Work remains on the bench until the player completes it.
   return aged;
  });
  const interestCharged=base.finance&&base.finance.mode==="hard"&&base.day%E.INTEREST_PERIOD===0?
   Math.round(base.finance.principal*E.FINANCE_MODES.hard.rateBps/10000):0;
  const finance=base.finance?{
   ...base.finance,interestDue:base.finance.interestDue+interestCharged,
   interestCharges:base.finance.interestCharges.concat(interestCharged||base.finance.mode==="hard"&&base.day%E.INTEREST_PERIOD===0?
    [{day:base.day,amount:interestCharged}]:[])
  }:undefined;
  const cash=s.cash-E.RENT;
  check(cash>=0,"家賃を支払う資金がありません。");
  const profit=s.revenue-s.cogs-E.RENT-interestCharged;
  const report={day:base.day,revenue:s.revenue,procurement:s.procurement,
   repairSpending:s.repairSpending,repaired:s.repaired,equipmentCost:s.equipmentCost,
   equipmentLevel:s.equipmentLevel,customers:s.customers,customerCount:s.customers.length,
   shelfCount:inventory.filter(x=>(x.zone??"shelf")==="shelf").length,
   warehouseCount:inventory.filter(x=>x.zone==="warehouse").length,
   workshopCount:inventory.filter(x=>x.zone==="workshop").length,
   cogs:s.cogs,rent:E.RENT,interestCharged,profit,cash,inventory:inventory.length,
   sold:s.sold,bought:s.bought,rejectedOffers:s.rejectedOffers,negotiations:s.negotiations,
   expectedSales:Math.round(s.expectedSales*100)/100,
   negotiationSavings:s.negotiations.reduce((n,o)=>n+(o.cost?o.ask-o.cost:0),0),
   soldItems:s.soldItems,skippedVisitors:skipped,events:s.logs};
  const next={...base,day:base.day+1,cash,inventory,equipmentLevel:s.equipmentLevel,ownedTools:s.ownedTools,
   totalSold:base.totalSold+s.sold,...(finance?{finance}:{}),
   reputation:Math.min(100,Math.max(0,base.reputation+(s.sold>=2?1:(inventory.length>10&&s.sold===0?-1:0)))),
   history:base.history.concat([{day:base.day,profit,cash,sold:s.sold,revenue:s.revenue,
    procurement:s.procurement,cogs:s.cogs,repairSpending:s.repairSpending,
    equipmentCost:s.equipmentCost,rent:E.RENT,interestCharged}]),
   ...(base.day%E.DAYS_PER_MONTH===0?{pendingMonth:{month:base.day/E.DAYS_PER_MONTH}}:{})};
  delete next.liveSession;
  E.validate(next);
  return {state:next,report};
 }
 return Object.freeze({TOOLS,schedule,initial,validate,until,respond,configure,buyTool,completeToolset,workOn,stopRepair,finish});
});
