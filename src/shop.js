/* UsedItemShopSimulator: deterministic offline buy-price-sell engine. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UsedItemShop = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const TYPES = Object.freeze({
    camera: {name:'中古カメラ', base:36000, interest:0.52},
    console: {name:'ゲーム機', base:26000, interest:0.66},
    audio: {name:'オーディオ', base:19000, interest:0.46},
    book: {name:'希少本', base:9000, interest:0.38}
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
  function saleChance(type,grade,price,fair,day,reputation=55) {
    integer(price,'販売価格',1,1000000);
    const seasonal=1+0.08*Math.sin(day*0.31);
    integer(reputation,'お店の評判',0,100);
    const relative=price/fair;
    const repeatCustomers=0.8+0.2*reputation/55;
    return Math.max(0.02,Math.min(0.94,TYPES[type].interest*GRADES[grade]*seasonal*repeatCustomers*Math.pow(relative,-2.4)));
  }
  function advance(input,plan) {
    const state=validate(input);
    if(state.day>180) throw Error('180日間の経営を完走しました。');
    if(!plan || !Array.isArray(plan.buy)||!Array.isArray(plan.prices)) throw Error('仕入計画が不正です。');
    const avail=new Map(offers(state).map(x=>[x.id,x]));
    const purchases=[],selected=new Set(),rejectedOffers=[];
    for(const choice of plan.buy){
      if(!choice || !avail.has(choice.id) || selected.has(choice.id)) throw Error('仕入先の指定が重複・不正です。');
      selected.add(choice.id);
      const offer=avail.get(choice.id);
      // Old plans without a bid remain valid at the full asking price.
      const bid=integer(choice.bid??offer.ask,'買取提示額',100,1000000);
      const price=integer(choice.price,'値付け',1,1000000);
      if(bid>offer.ask) throw Error('買取提示額は売り手の希望額以下にしてください。');
      // The seller's private reserve price is determined before decisions,
      // so rerunning the same day cannot obtain a better random negotiation roll.
      const reserve=Math.max(100,Math.round(offer.ask*(0.72+0.20*random(state.seed,state.day,600+offer.id))/100)*100);
      if(bid<reserve){
        rejectedOffers.push({id:offer.id,name:offer.name,bid,ask:offer.ask});
      }else{
        purchases.push({...offer,cost:bid,price});
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
      repairMap.set(id,{...item,grade:newGrade,fair,cost:item.cost+price});
    }
    const procurement=purchases.reduce((sum,x)=>sum+x.cost,0);
    if(state.cash<RentAndBuy(procurement+repairSpending)) throw Error('仕入と家賃を支払う資金がありません。');
    let revenue=0,cogs=0,sold=0;
    const nextInventory=[],soldItems=[];
    const candidate=state.inventory.map(x=>({...x,...(repairMap.get(x.id)||{}),price:changes.get(x.id)??x.price})).concat(purchases);
    for(const item of candidate){
      const chance=saleChance(item.type,item.grade,item.price,item.fair,state.day,state.reputation);
      if(random(state.seed,state.day,1000+item.id)<chance){
        revenue+=item.price;cogs+=item.cost;sold++;soldItems.push({name:TYPES[item.type].name,price:item.price,profit:item.price-item.cost});
      }else nextInventory.push(item);
    }
    const profit=revenue-cogs-RENT;
    const cash=state.cash-procurement-repairSpending-RENT+revenue;
    integer(cash,'残高',0,1e10);
    const report={day:state.day,revenue,procurement,repairSpending,repaired:repairIds.length,cogs,rent:RENT,profit,cash,inventory:nextInventory.length,sold,bought:purchases.length,
      rejectedOffers,negotiationSavings:purchases.reduce((n,p)=>n+p.ask-p.cost,0),soldItems};
    const next={...state,day:state.day+1,cash,inventory:nextInventory,totalSold:state.totalSold+sold,
      reputation:Math.min(100,Math.max(0,state.reputation+(sold>=2?1:(nextInventory.length>10&&sold===0?-1:0)))),
      history:state.history.concat([{day:report.day,profit:report.profit,cash:report.cash,sold:report.sold}])};
    validate(next);
    return {state:next,report};
  }
  function RentAndBuy(procurement){return procurement+RENT;}
  return Object.freeze({VERSION,TYPES,GRADES,RENT,CAPACITY,initial,validate,random,offers,saleChance,advance});
});
