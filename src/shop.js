/* UsedItemShopSimulator: deterministic offline buy-price-sell engine. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UsedItemShop = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const TYPES = Object.freeze({
    camera: {name:'中古カメラ', base:36000, interest:0.52, elasticity:1.8, wearRate:1.0},
    console: {name:'ゲーム機', base:26000, interest:0.66, elasticity:2.5, wearRate:1.25},
    audio: {name:'オーディオ', base:19000, interest:0.46, elasticity:2.0, wearRate:1.0},
    book: {name:'希少本', base:9000, interest:0.38, elasticity:1.4, wearRate:0.7}
  });
  const GRADES = Object.freeze({A:1.16,B:1,C:0.72});
  const RENT = 3500, CAPACITY = 18;
  function integer(n,label,min,max) {
    if (!Number.isSafeInteger(n) || n<min || n>max) throw Error(`${label}は${min}〜${max}の整数で指定してください。`);
    return n;
  }
  function random(seed,day,salt) {
    let h = (Math.imul(seed,1664525) + Math.imul(day,1013904223) + Math.imul(salt,2654435761)) >>> 0;
    h ^= h>>>16; h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
    return (h>>>0)/4294967296;
  }
  function initial(seed=20261018) {
    integer(seed,'乱数シード',1,2147483647);
    return {version:VERSION,seed,day:1,cash:700000,inventory:[],history:[],totalSold:0,reputation:55};
  }
  function validate(input) {
    if (!input || input.version!==VERSION || !Array.isArray(input.inventory) || !Array.isArray(input.history)) throw Error('セーブデータの形式が違います。');
    integer(input.seed,'seed',1,2147483647);integer(input.day,'day',1,181);
    integer(input.cash,'cash',0,1e10);integer(input.reputation,'reputation',0,100);
    integer(input.totalSold,'totalSold',0,1e7);
    if(input.inventory.length>CAPACITY || input.history.length!==input.day-1) throw Error('セーブの在庫または履歴が不正です。');
    const seen=new Set();
    for(const item of input.inventory){
      if(!item || !Number.isSafeInteger(item.id) || item.id<1 || seen.has(item.id) || !TYPES[item.type] || !GRADES[item.grade]) throw Error('在庫データが不正です。');
      seen.add(item.id);integer(item.cost,'原価',1,1000000);integer(item.price,'販売価格',1,1000000);integer(item.fair,'目利き評価額',1,1000000);
      integer(item.ageDays??0,'保管日数',0,180);
      integer(item.wearDays??0,'整備からの経過',0,180);
      if(item.wearDays!==undefined&&item.ageDays!==undefined&&item.wearDays>item.ageDays)throw Error('摩耗記録が不正です。');
    }
    let countedSold=0;for(let i=0;i<input.history.length;i++){const h=input.history[i];if(!h||h.day!==i+1||!Number.isSafeInteger(h.profit)||!Number.isSafeInteger(h.cash)||h.cash<0||!Number.isSafeInteger(h.sold)||h.sold<0)throw Error('履歴が不正です。');countedSold+=h.sold;}if(input.totalSold!==countedSold)throw Error('累計販売数と履歴が一致しません。');
    return JSON.parse(JSON.stringify(input));
  }
  function offers(state) {
    validate(state);
    const keys=Object.keys(TYPES);
    return Array.from({length:3},(_,i)=>{
      const id=state.day*10+i+1;
      const type=keys[Math.floor(random(state.seed,state.day,100+i)*keys.length)];
      const grade=['A','B','C'][Math.floor(random(state.seed,state.day,200+i)*3)];
      const fair=Math.round(TYPES[type].base*GRADES[grade]*(0.88+0.24*random(state.seed,state.day,300+i)));
      const ask=Math.max(100,Math.round(fair*(0.43+0.30*random(state.seed,state.day,400+i))/100)*100);
      return {id,type,grade,name:TYPES[type].name,ask,fair,defaultPrice:Math.round(fair*1.05/100)*100};
    });
  }
  const FALLBACKS=Object.freeze({walk:'失敗したら購入しない',ask:'希望額で買い取る',premium:'上乗せ額で買い取る'});
  function counterPrice(ask,fallback){
    integer(ask,'希望額',100,1000000);
    if(fallback==='ask')return ask;
    if(fallback==='premium')return Math.min(1000000,Math.ceil(ask*1.06/100)*100);
    if(fallback==='walk')return 0;
    throw Error('交渉失敗時の方針が不正です。');
  }
  // Seller-side supply response. A higher offered bid increases the probability
  // of agreeing to sell. Each lead has one stable random draw for this day.
  function offerProbability(ask,bid){
    integer(ask,'希望額',100,1000000);integer(bid,'買取提示額',100,1000000);
    if(bid>ask)throw Error('買取提示額は希望額以下にしてください。');
    if(bid>=ask)return 1;
    const ratio=bid/ask;
    if(ratio<0.60)return 0.015;
    return Math.min(0.97,Math.max(0.015,Math.pow((ratio-0.58)/0.42,2.0)));
  }
  function marketDemand(seed,day,type){
    const names=Object.keys(TYPES),idx=names.indexOf(type);
    if(idx<0)throw Error('商品種類が不正です。');
    // Buyers' preference shifts slowly and is not controlled by shop decisions.
    return 0.86+0.28*random(seed,day,780+idx);
  }
  function ageItem(item){
    const ageDays=integer(item.ageDays??0,'保管日数',0,180)+1;
    let wearDays=integer(item.wearDays??0,'整備からの経過',0,180)+1;
    let grade=item.grade,fair=Math.max(1,Math.round(item.fair*(1-0.0035*TYPES[item.type].wearRate)));
    if(wearDays>=14){
      if(grade==='A')grade='B';else if(grade==='B')grade='C';
      if(grade!==item.grade)fair=Math.max(1,Math.round(fair*0.92));
      wearDays=0;
    }
    return {...item,ageDays,wearDays,grade,fair};
  }
  function saleChance(type,grade,price,fair,day,reputation=55) {
    integer(price,'販売価格',1,1000000);
    const seasonal=1+0.08*Math.sin(day*0.31);
    integer(reputation,'お店の評判',0,100);
    const relative=price/fair;
    const repeatCustomers=0.8+0.2*reputation/55;
    const elasticity=TYPES[type].elasticity;
    return Math.max(0.003,Math.min(0.94,TYPES[type].interest*GRADES[grade]*seasonal*repeatCustomers*Math.pow(relative,-elasticity)));
  }
  function advance(input,plan) {
    const state=validate(input);
    if(state.day>180) throw Error('180日間の経営を完走しました。');
    if(!plan || !Array.isArray(plan.buy)||!Array.isArray(plan.prices)) throw Error('仕入計画が不正です。');
    const avail=new Map(offers(state).map(x=>[x.id,x]));
    const purchases=[],selected=new Set(),rejectedOffers=[],negotiations=[];
    for(const choice of plan.buy){
      if(!choice || !avail.has(choice.id) || selected.has(choice.id)) throw Error('仕入先の指定が重複・不正です。');
      selected.add(choice.id);
      const offer=avail.get(choice.id);
      // Omitted mode/bid comes from the original save-compatible fixed-price UI.
      const mode=choice.mode??(choice.bid===undefined?'fixed':'negotiate');
      if(!['fixed','negotiate'].includes(mode))throw Error('買取方法が不正です。');
      const fallback=choice.fallback??'walk';
      if(!Object.hasOwn(FALLBACKS,fallback))throw Error('交渉失敗時の方針が不正です。');
      const price=integer(choice.price,'値付け',1,1000000);
      const bid=integer(mode==='fixed'?offer.ask:(choice.bid??offer.ask),'買取提示額',100,1000000);
      const probability=mode==='fixed'?1:offerProbability(offer.ask,bid);
      const accepted=mode==='fixed'||random(state.seed,state.day,600+offer.id)<probability;
      const cost=accepted?bid:counterPrice(offer.ask,fallback);
      negotiations.push({id:offer.id,name:offer.name,mode,bid,ask:offer.ask,probability,accepted,
        fallback,cost});
      if(!cost){
        rejectedOffers.push({id:offer.id,name:offer.name,bid,ask:offer.ask});
      }else{
        purchases.push({...offer,cost,price,ageDays:0,wearDays:0});
      }
    }
    if(state.inventory.length+purchases.length>CAPACITY) throw Error('店内の在庫スペースが不足しています。');
    const changes=new Map();
    for(const choice of plan.prices){
      if(!choice || changes.has(choice.id) || !state.inventory.some(x=>x.id===choice.id)) throw Error('在庫値付けの指定が不正です。');
      changes.set(choice.id,integer(choice.price,'販売価格',1,1000000));
    }
    const repairIds=plan.repairs??[];
    if(!Array.isArray(repairIds))throw Error('修理計画が不正です。');
    const uniqueRepairs=new Set(repairIds);
    if(repairIds.length!==uniqueRepairs.size)throw Error('同じ商品を重複して修理できません。');
    let repairSpending=0;
    const repairMap=new Map();
    for(const id of repairIds){
      const item=state.inventory.find(x=>x.id===id);
      if(!item||item.grade==='A')throw Error('修理できない商品が指定されています。');
      const newGrade=item.grade==='C'?'B':'A';
      const price=Math.max(100,Math.round(item.fair*0.12/100)*100);
      const fair=Math.max(1,Math.round(item.fair*GRADES[newGrade]/GRADES[item.grade]));
      if(item.cost+price>1000000||fair>1000000)throw Error('修理後の評価額が上限を超えます。');
      repairSpending+=price;
      repairMap.set(id,{...item,grade:newGrade,fair,cost:item.cost+price,wearDays:0});
    }
    const procurement=purchases.reduce((sum,x)=>sum+x.cost,0);
    // Check the highest cash exposure before executing a possible negotiation.
    const committed=negotiations.reduce((sum,n)=>sum+(n.mode==='fixed'?n.ask:
      Math.max(n.bid,counterPrice(n.ask,n.fallback))),0);
    if(state.cash<RentAndBuy(committed+repairSpending)) throw Error('仕入と家賃を支払う資金がありません。');
    let revenue=0,cogs=0,sold=0;
    const nextInventory=[],soldItems=[];
    const candidate=state.inventory.map(x=>({...x,...(repairMap.get(x.id)||{}),price:changes.get(x.id)??x.price})).concat(purchases);
    for(const item of candidate){
      const chance=Math.min(0.94,saleChance(item.type,item.grade,item.price,item.fair,state.day,state.reputation)*
        marketDemand(state.seed,state.day,item.type));
      if(random(state.seed,state.day,1000+item.id)<chance){
        revenue+=item.price;cogs+=item.cost;sold++;soldItems.push({name:TYPES[item.type].name,price:item.price,profit:item.price-item.cost});
      }else nextInventory.push(ageItem(item));
    }
    const profit=revenue-cogs-RENT;
    const cash=state.cash-procurement-repairSpending-RENT+revenue;
    integer(cash,'残高',0,1e10);
    const report={day:state.day,revenue,procurement,repairSpending,repaired:repairIds.length,cogs,rent:RENT,profit,cash,inventory:nextInventory.length,sold,bought:purchases.length,
      rejectedOffers,negotiations,expectedSales:Math.round(candidate.reduce((sum,x)=>sum+
        Math.min(0.94,saleChance(x.type,x.grade,x.price,x.fair,state.day,state.reputation)*
          marketDemand(state.seed,state.day,x.type)),0)*100)/100,
      negotiationSavings:purchases.reduce((n,p)=>n+p.ask-p.cost,0),soldItems};
    const next={...state,day:state.day+1,cash,inventory:nextInventory,totalSold:state.totalSold+sold,
      reputation:Math.min(100,Math.max(0,state.reputation+(sold>=2?1:(nextInventory.length>10&&sold===0?-1:0)))),
      history:state.history.concat([{day:report.day,profit:report.profit,cash:report.cash,sold:report.sold}])};
    validate(next);
    return {state:next,report};
  }
  function RentAndBuy(procurement){return procurement+RENT;}
  return Object.freeze({VERSION,TYPES,GRADES,RENT,CAPACITY,FALLBACKS,initial,validate,random,offers,saleChance,offerProbability,counterPrice,marketDemand,ageItem,advance});
});
