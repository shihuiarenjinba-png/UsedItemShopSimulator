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
    book: {name:'希少本', base:9000, interest:0.38, elasticity:1.4, wearRate:0.7},
    car: {name:'中古車', base:520000, interest:0.18, elasticity:2.2, wearRate:1.4}
  });
  const GRADES = Object.freeze({A:1.16,B:1,C:0.72});
  const RENT = 3500, CAPACITY = 18, SHELF_CAPACITY = 8, EQUIPMENT_UPGRADE_COST=65000;
  const STAFF=Object.freeze([{id:'rush',name:'急いで現金化したい',bias:0.80,icon:'🏃'},{id:'normal',name:'価格は相談できる',bias:0.12,icon:'🙂'},{id:'careful',name:'相場に詳しく慎重',bias:-0.78,icon:'🧐'}]);
  const BUYERS=Object.freeze([{name:'近所の常連',icon:'🧑',kind:'camera'},{name:'ゲーム好き',icon:'🎮',kind:'console'},{name:'音楽好き',icon:'🎵',kind:'audio'},{name:'本好き',icon:'📚',kind:'book'},{name:'車を探す人',icon:'🚗',kind:'car'},{name:'通りがかりの人',icon:'🚶',kind:null}]);
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
    return {version:VERSION,seed,day:1,cash:700000,inventory:[],history:[],totalSold:0,reputation:55,equipmentLevel:1};
  }
  function validate(input) {
    if (!input || input.version!==VERSION || !Array.isArray(input.inventory) || !Array.isArray(input.history)) throw Error('セーブデータの形式が違います。');
    integer(input.seed,'seed',1,2147483647);integer(input.day,'day',1,181);
    integer(input.cash,'cash',0,1e10);integer(input.reputation,'reputation',0,100);
    integer(input.totalSold,'totalSold',0,1e7);integer(input.equipmentLevel??1,'設備レベル',1,2);
    if(input.inventory.length>CAPACITY || input.history.length!==input.day-1) throw Error('セーブの在庫または履歴が不正です。');
    const seen=new Set();
    const explicitShelf=input.inventory.filter(x=>x.zone==='shelf').length;
    if(explicitShelf>SHELF_CAPACITY)throw Error('売場が満杯です。');
    for(const item of input.inventory){
      if(!item || !Number.isSafeInteger(item.id) || item.id<1 || seen.has(item.id) || !TYPES[item.type] || !GRADES[item.grade]) throw Error('在庫データが不正です。');
      seen.add(item.id);integer(item.cost,'原価',1,1000000);integer(item.price,'販売価格',1,1000000);integer(item.fair,'目利き評価額',1,1000000);
      if(!['warehouse','workshop','shelf'].includes(item.zone??'shelf'))throw Error('保管場所が不正です。');
      integer(item.acquiredDay??Math.max(1,input.day-1-(item.ageDays??0)),'取得日',1,input.day);
      if(item.zone==='workshop'&&(!Number.isSafeInteger(item.repairReadyDay)||item.repairReadyDay>input.day+1||item.repairReadyDay<input.day))throw Error('修理完了日が不正です。');
      integer(item.ageDays??0,'保管日数',0,180);
      if((item.ageDays??0)>input.day-1)throw Error('保管日数と営業日が一致しません。');
      integer(item.wearDays??0,'整備からの経過',0,180);
      if(item.wearDays!==undefined&&item.ageDays!==undefined&&item.wearDays>item.ageDays)throw Error('摩耗記録が不正です。');
    }
    let countedSold=0;for(let i=0;i<input.history.length;i++){const h=input.history[i];if(!h||h.day!==i+1||!Number.isSafeInteger(h.profit)||!Number.isSafeInteger(h.cash)||h.cash<0||!Number.isSafeInteger(h.sold)||h.sold<0)throw Error('履歴が不正です。');countedSold+=h.sold;}if(input.totalSold!==countedSold)throw Error('累計販売数と履歴が一致しません。');
    const migrated=JSON.parse(JSON.stringify(input));
    // Prior v1 saves could have as many as 18 unzoned sale items. Keep all
    // holdings and move only the excess to the warehouse, never discard them.
    const implicit=migrated.inventory.filter(x=>x.zone===undefined);
    if(explicitShelf+implicit.length>SHELF_CAPACITY){
      let slots=SHELF_CAPACITY-explicitShelf;
      for(const item of implicit){item.zone=slots>0?'shelf':'warehouse';slots--;}
    }
    return migrated;
  }
  function offers(state) {
    validate(state);
    const keys=Object.keys(TYPES).filter(x=>x!=='car');
    return Array.from({length:3},(_,i)=>{
      const id=state.day*10+i+1;
      // Cars are occasional higher-capital offers unlocked after 20 shop days.
      const type=state.day>=21&&i===2&&random(state.seed,state.day,930)>.52?
        'car':keys[Math.floor(random(state.seed,state.day,100+i)*keys.length)];
      const grade=['A','B','C'][Math.floor(random(state.seed,state.day,200+i)*3)];
      const fair=Math.round(TYPES[type].base*GRADES[grade]*(0.88+0.24*random(state.seed,state.day,300+i)));
      const ask=Math.max(100,Math.round(fair*(0.43+0.30*random(state.seed,state.day,400+i))/100)*100);
      const seller=STAFF[Math.floor(random(state.seed,state.day,520+i)*STAFF.length)];
      const minutes=10*60+Math.floor(random(state.seed,state.day,540+i)*8*60);
      const arrival=('0'+Math.floor(minutes/60)).slice(-2)+':'+('0'+minutes%60).slice(-2);
      return {id,type,grade,name:TYPES[type].name,ask,fair,defaultPrice:Math.round(fair*1.05/100)*100,
        seller:seller.id,sellerName:seller.name,sellerIcon:seller.icon,arrival};
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
  function offerProbability(ask,bid,seller='normal'){
    integer(ask,'希望額',100,1000000);integer(bid,'買取提示額',100,1000000);
    if(bid>ask)throw Error('買取提示額は希望額以下にしてください。');
    if(bid>=ask)return 1;
    const ratio=bid/ask;
    const person=STAFF.find(x=>x.id===seller)||STAFF[1];
    // This curve is a game-balance assumption, NOT measured retail behavior.
    // A bid equal to 60% of the ask is plausible even for a typical seller,
    // and urgency increases willingness to accept it.
    const logistic=1/(1+Math.exp(-(5.5*(ratio-.56)+person.bias)));
    return Math.min(.975,Math.max(.025,.02+.96*logistic));
  }
  function marketDemand(seed,day,type){
    const names=Object.keys(TYPES),idx=names.indexOf(type);
    if(idx<0)throw Error('商品種類が不正です。');
    // Buyers' preference shifts slowly and is not controlled by shop decisions.
    return 0.86+0.28*random(seed,day,780+idx);
  }
  function customerArrivals(state){
    validate(state);
    const weekend=[0,6].includes((state.day-1)%7);
    const rate=2.8+state.reputation/40+(weekend?1.1:0);
    // Inverse-CDF sampling: non-network, reproducible visitor count.
    let count=0,p=Math.exp(-rate),cdf=p,roll=random(state.seed,state.day,4000);
    while(roll>cdf&&count<18){count++;p*=rate/count;cdf+=p;}
    const schedule=[];
    for(let i=0;i<count;i++){
      const kind=BUYERS[Math.floor(random(state.seed,state.day,4100+i)*BUYERS.length)];
      const hourWeights=[.5,.7,1.3,1.1,.6,.7,1.1,1.6,1.4];
      let r=random(state.seed,state.day,4200+i)*hourWeights.reduce((a,b)=>a+b,0),hour=10;
      for(let j=0;j<hourWeights.length;j++){r-=hourWeights[j];if(r<=0){hour=10+j;break;}}
      const minute=Math.floor(random(state.seed,state.day,4300+i)*60);
      schedule.push({id:i+1,name:kind.name,icon:kind.icon,kind:kind.kind,
        arrival:('0'+hour).slice(-2)+':'+('0'+minute).slice(-2)});
    }
    return schedule.sort((a,b)=>a.arrival.localeCompare(b.arrival)||a.id-b.id);
  }
  function buyerChance(state,item,visitor){
    const affinity=visitor.kind===item.type?1.32:(visitor.kind===null?.92:.62);
    return Math.min(.92,Math.max(.001,saleChance(item.type,item.grade,item.price,item.fair,state.day,state.reputation)*
      marketDemand(state.seed,state.day,item.type)*affinity));
  }
  function repairPrice(item,equipmentLevel=1){
    return Math.max(100,Math.round(item.fair*(equipmentLevel>=2?.09:.12)/100)*100);
  }
  function safePrice(item,state,expectedDays=21){
    integer(expectedDays,'保有予定日',1,180);
    const carrying=Math.ceil(item.fair*.002*TYPES[item.type].wearRate*expectedDays/100)*100;
    const allocatedRent=Math.round(RENT*expectedDays/Math.max(2,SHELF_CAPACITY)/100)*100;
    // The upgraded repair equipment is a capital expenditure, recovered as
    // an indicative per-item allocation over 65 future sales, not as a
    // second charge on the day the machine is purchased.
    const equipmentAllocation=(state.equipmentLevel??1)>=2?Math.ceil(EQUIPMENT_UPGRADE_COST/65/100)*100:0;
    const cost=item.cost+carrying+allocatedRent+equipmentAllocation;
    const breakEven=Math.ceil(cost/100)*100;
    const target=Math.ceil(breakEven*1.18/100)*100;
    const price=item.price;
    const warning=breakEven>1000000?'販売価格の上限内で費用を回収できない見込み':
      price<breakEven?'保管・家賃・設備を考慮すると採算割れのおそれ':
      '想定費用を上回る価格（売却保証ではありません）';
    return {breakEven,target,acquisitionCost:item.cost,carrying,allocatedRent,equipmentAllocation,
      profitBuffer:price-cost,warning};
  }
  function ageItem(item){
    const ageDays=integer(item.ageDays??0,'保管日数',0,180)+1;
    let wearDays=integer(item.wearDays??0,'整備からの経過',0,180)+1;
    let grade=item.grade,fair=Math.max(1,Math.round(item.fair*(1-0.002*TYPES[item.type].wearRate)));
    if(wearDays>=Math.ceil(30/TYPES[item.type].wearRate)){
      if(grade==='A')grade='B';else if(grade==='B')grade='C';
      if(grade!==item.grade)fair=Math.max(1,Math.round(fair*0.94));
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
      const probability=mode==='fixed'?1:offerProbability(offer.ask,bid,offer.seller);
      const accepted=mode==='fixed'||random(state.seed,state.day,600+offer.id)<probability;
      const cost=accepted?bid:counterPrice(offer.ask,fallback);
      negotiations.push({id:offer.id,name:offer.name,mode,bid,ask:offer.ask,probability,accepted,
        fallback,cost});
      if(!cost){
        rejectedOffers.push({id:offer.id,name:offer.name,bid,ask:offer.ask});
      }else{
        purchases.push({...offer,cost,price,ageDays:0,wearDays:0,acquiredDay:state.day,zone:'warehouse'});
      }
    }
    if(state.inventory.length+purchases.length>CAPACITY) throw Error('店内の在庫スペースが不足しています。');
    const listIds=plan.list??[];if(!Array.isArray(listIds)||new Set(listIds).size!==listIds.length)throw Error('商品化する在庫の指定が不正です。');
    const changes=new Map();
    for(const choice of plan.prices){
      if(!choice || changes.has(choice.id) || !state.inventory.some(x=>x.id===choice.id)) throw Error('在庫値付けの指定が不正です。');
      changes.set(choice.id,integer(choice.price,'販売価格',1,1000000));
    }
    const repairIds=plan.repairs??[];
    if(!Array.isArray(repairIds))throw Error('修理計画が不正です。');
    const uniqueRepairs=new Set(repairIds);
    if(repairIds.length!==uniqueRepairs.size)throw Error('同じ商品を重複して修理できません。');
    const upgrade=plan.equipmentUpgrade===true;
    if(upgrade&&(state.equipmentLevel??1)>=2)throw Error('機材はすでに強化されています。');
    const equipmentCost=upgrade?EQUIPMENT_UPGRADE_COST:0;
    const equipmentLevel=Math.min(2,(state.equipmentLevel??1)+Number(upgrade));
    if(repairIds.length>equipmentLevel)throw Error('修理台の数が足りません。');
    let repairSpending=0;
    const repairMap=new Map();
    for(const id of repairIds){
      const item=state.inventory.find(x=>x.id===id);
      if(!item||item.grade==='A'||(item.zone??'shelf')==='workshop')throw Error('修理できない商品が指定されています。');
      const newGrade=item.grade==='C'?'B':'A';
      const price=repairPrice(item,equipmentLevel);
      const fair=Math.max(1,Math.round(item.fair*GRADES[newGrade]/GRADES[item.grade]));
      if(item.cost+price>1000000||fair>1000000)throw Error('修理後の評価額が上限を超えます。');
      repairSpending+=price;
      repairMap.set(id,{...item,grade:newGrade,fair,cost:item.cost+price,wearDays:0,zone:'workshop',repairReadyDay:state.day+1});
    }
    const procurement=purchases.reduce((sum,x)=>sum+x.cost,0);
    const updatable=state.inventory.map(item=>{
      if((item.zone??'shelf')==='workshop'&&item.repairReadyDay<=state.day){const {repairReadyDay,...rest}=item;return {...rest,zone:'warehouse'};}
      return {...item};
    });
    const listing=new Set(listIds);
    for(const id of listing){
      const item=state.inventory.find(x=>x.id===id);
      if(!item||item.zone!=='warehouse'||repairMap.has(id))throw Error('売場へ並べられない商品です。');
    }
    const shelfCount=updatable.filter(x=>(x.zone??'shelf')==='shelf'&&!repairMap.has(x.id)).length+listing.size;
    if(shelfCount>SHELF_CAPACITY)throw Error('売場の陳列スペースが足りません。');
    // Check the highest cash exposure before executing a possible negotiation.
    const committed=negotiations.reduce((sum,n)=>sum+(n.mode==='fixed'?n.ask:
      Math.max(n.bid,counterPrice(n.ask,n.fallback))),0);
    if(state.cash<RentAndBuy(committed+repairSpending+equipmentCost)) throw Error('仕入と家賃を支払う資金がありません。');
    let revenue=0,cogs=0,sold=0;
    const nextInventory=[],soldItems=[];
    const candidate=updatable.map(x=>({...x,...(repairMap.get(x.id)||{}),
      zone:listing.has(x.id)?'shelf':(repairMap.get(x.id)?.zone??x.zone??'shelf'),
      price:changes.get(x.id)??x.price})).concat(purchases);
    const arrivals=customerArrivals(state),remaining=new Map(candidate.filter(x=>(x.zone??'shelf')==='shelf').map(x=>[x.id,x]));
    const customerLog=[];
    let expectedSales=0;
    // Each customer can buy at most one displayed item; an item can sell once.
    for(const visitor of arrivals){
      const eligible=[...remaining.values()];
      const ranked=eligible.map(item=>({item,chance:buyerChance(state,item,visitor),
        preference:random(state.seed,state.day,5000+visitor.id*100+item.id)}))
       .sort((a,b)=>(b.chance*(1-b.preference/4))-(a.chance*(1-a.preference/4)));
      const selected=ranked[0];if(!selected){customerLog.push({...visitor,bought:false});continue;}
      expectedSales+=selected.chance;
      const soldNow=random(state.seed,state.day,6000+visitor.id*100+selected.item.id)<selected.chance;
      customerLog.push({...visitor,bought:soldNow,
        product:soldNow?TYPES[selected.item.type].name:null});
      if(soldNow){
        remaining.delete(selected.item.id);
        const item=selected.item;revenue+=item.price;cogs+=item.cost;sold++;
        soldItems.push({name:TYPES[item.type].name,price:item.price,profit:item.price-item.cost});
      }
    }
    const soldIds=new Set(candidate.filter(x=>(x.zone??'shelf')==='shelf'&&!remaining.has(x.id)).map(x=>x.id));
    for(const item of candidate)if(!soldIds.has(item.id))nextInventory.push(ageItem(item));
    const profit=revenue-cogs-RENT;
    const cash=state.cash-procurement-repairSpending-equipmentCost-RENT+revenue;
    integer(cash,'残高',0,1e10);
    const report={day:state.day,revenue,procurement,repairSpending,repaired:repairIds.length,equipmentCost,equipmentLevel,customers:customerLog,customerCount:arrivals.length,
      shelfCount:nextInventory.filter(x=>(x.zone??'shelf')==='shelf').length,
      warehouseCount:nextInventory.filter(x=>x.zone==='warehouse').length,
      workshopCount:nextInventory.filter(x=>x.zone==='workshop').length,
      cogs,rent:RENT,profit,cash,inventory:nextInventory.length,sold,bought:purchases.length,
      rejectedOffers,negotiations,expectedSales:Math.round(expectedSales*100)/100,
      negotiationSavings:purchases.reduce((n,p)=>n+p.ask-p.cost,0),soldItems};
    const next={...state,day:state.day+1,cash,inventory:nextInventory,equipmentLevel,totalSold:state.totalSold+sold,
      reputation:Math.min(100,Math.max(0,state.reputation+(sold>=2?1:(nextInventory.length>10&&sold===0?-1:0)))),
      history:state.history.concat([{day:report.day,profit:report.profit,cash:report.cash,sold:report.sold}])};
    validate(next);
    return {state:next,report};
  }
  function RentAndBuy(procurement){return procurement+RENT;}
  return Object.freeze({VERSION,TYPES,GRADES,RENT,CAPACITY,SHELF_CAPACITY,EQUIPMENT_UPGRADE_COST,STAFF,FALLBACKS,initial,validate,random,offers,saleChance,offerProbability,counterPrice,marketDemand,ageItem,customerArrivals,buyerChance,repairPrice,safePrice,advance});
});
