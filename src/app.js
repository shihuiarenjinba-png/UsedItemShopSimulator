/* Used Item Shop: one-screen, three-step offline interface. */
(function(){'use strict';
 const E=window.UsedItemShop,T=window.ShopTime,L=window.ShopLive,$=id=>document.getElementById(id),
   KEY='used-item-shop:save:v1',BACKUP_KEY='used-item-shop:previous-run:v1',
   TIME_KEY='used-item-shop:active-time:v1',BACKUP_TIME_KEY='used-item-shop:previous-time:v1';
 let state,notice='',recoveryBlocked=false,originalRaw=null,lastReport=null,onboardingRequired=false,repayNotice='';
 let clock,lastTick=0,clockTimer=null,clockNotice='',monthNotice='';

 let selectedRepairId=null,warehousePage=0;
 const live=()=>state.liveSession??null;
 const storeItems=()=>live()?.inventory??state.inventory;
 const shopCash=()=>live()?.cash??state.cash;
 function commitLive(next){state={...state,liveSession:next};persist();}
 function ensureLive(){if(!live()){state={...state,liveSession:L.initial(state)};persist();}return live();}
 function applyPlan(){
  if(recoveryBlocked||onboardingRequired||state.pendingMonth)return false;
  try{
   commitLive(L.configure(state,ensureLive(),plan()));clockNotice='在庫・機材の変更を反映しました。';
   refresh();return true;
  }catch(e){clockNotice=e.message;updateClock();refreshBudget();return false;}
 }
 function processArrivals(untilMinute){
  const before=ensureLive(),result=L.until(state,before,untilMinute);
  if(result.session.cursor!==before.cursor||result.session.minute!==before.minute||
     result.session.pendingSeller!==before.pendingSeller)commitLive(result.session);
  if(result.interrupted){
   const frac=(result.minute-T.OPEN_MINUTES)/(T.CLOSE_MINUTES-T.OPEN_MINUTES);
   clock=T.paused({...clock,elapsedMs:Math.round(frac*T.DAY_MS)});
   if(clockTimer!==null){clearInterval(clockTimer);clockTimer=null;}
   saveClock();clockNotice='買取希望者が来店！提示額を確認して対応してください。';refresh();return true;
  }
  if(result.session.cursor!==before.cursor)refresh();
  return false;
 }
 function answerSeller(buy){
  if(!live()?.pendingSeller)return;
  try{
   const candidate=buy?plan().buy[0]:null;
   if(buy&&!candidate)throw Error('この品物を買い取る欄にチェックしてください。');
   const out=L.respond(state,live(),candidate);commitLive(out.session);
   clockNotice=out.action?(out.action.cost?'買取成立！商品を倉庫へ保管しました。':'買取交渉が不成立でした。'):'今回の買取を見送りました。';
   refresh();
  }catch(e){clockNotice=e.message;updateClock();}
 }
 function playSound(note=660){
   if(!state?.settings?.soundEnabled||typeof window.AudioContext!=='function')return;
   try{
     const context=new window.AudioContext(),osc=context.createOscillator(),gain=context.createGain();
     osc.type='sine';osc.frequency.value=note;
     gain.gain.setValueAtTime(.06,context.currentTime);
     gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.13);
     osc.connect(gain);gain.connect(context.destination);
     osc.onended=()=>{void context.close();};
     osc.start();osc.stop(context.currentTime+.14);
   }catch(_error){/* Sound is optional; never break trading or saving. */}
 }
 function toggleSound(){
   state={...state,settings:{...state.settings,soundEnabled:!state.settings?.soundEnabled}};
   persist();renderSound();
   if(state.settings.soundEnabled)playSound(720);
 }
 function renderSound(){
   const enabled=!!state.settings?.soundEnabled;
   $('soundToggleBtn').textContent=enabled?'🔊 作業効果音：ON':'🔇 作業効果音：OFF';
   $('soundToggleBtn').setAttribute('aria-pressed',String(enabled));
 }
 function buyTool(id){
  try{commitLive(L.buyTool(state,ensureLive(),id));clockNotice='工具を定価で購入しました。';refresh();}
  catch(e){clockNotice=e.message;updateClock();}
 }
 function buyToolset(){
  try{commitLive(L.completeToolset(state,ensureLive()));clockNotice='未所持の工具を一括定価購入しました。';refresh();}
  catch(e){clockNotice=e.message;updateClock();}
 }
 function chooseRepair(id){selectedRepairId=id;renderWorkshop();}
 function useTool(id){
  try{commitLive(L.workOn(state,ensureLive(),selectedRepairId,id));playSound(590);clockNotice='作業が進みました。';refresh();}
  catch(e){clockNotice=e.message;updateClock();}
 }
 function stopRepair(){
  try{commitLive(L.stopRepair(state,ensureLive(),selectedRepairId));clockNotice='現状品として倉庫に戻しました。';selectedRepairId=null;refresh();}
  catch(e){clockNotice=e.message;updateClock();}
 }

 const monotonic=()=>typeof performance!=='undefined'?performance.now():Date.now();
 function restoreClock(){
   const raw=localStorage.getItem(TIME_KEY);
   if(!raw)return T.initial(state.day);
   try{
    let restored=T.validate(JSON.parse(raw),state.day);
    if(live()){
     const elapsed=Math.round((live().minute-T.OPEN_MINUTES)/(T.CLOSE_MINUTES-T.OPEN_MINUTES)*T.DAY_MS);
     if(elapsed>restored.elapsedMs)restored={...restored,elapsedMs:elapsed};
    }
    return restored;
   }
   catch(error){clockNotice='営業時計の保存情報に不整合があるため10:00から停止しています。元データは保持されています。';
     return T.initial(state.day);}
 }
 function saveClock(){try{localStorage.setItem(TIME_KEY,JSON.stringify(clock));}
   catch(error){clockNotice='営業時計を保存できません。閉店・終了前にセーブ環境を確認してください。';}}
 function stopClock(){if(clockTimer!==null){clearInterval(clockTimer);clockTimer=null;}if(clock)clock=T.paused(clock);saveClock();}
 function pulse(){
   if(!clock||clock.paused)return;
   if(document.hidden){stopClock();updateClock();return;}
   const now=monotonic(),delta=Math.min(5000,Math.max(0,Math.floor(now-lastTick)));lastTick=now;
   if(delta>0){
    const upcoming=T.tick(clock,delta);
    if(processArrivals(T.gameMinutes(upcoming)))return;
    clock=upcoming;
   }
   if(clock.elapsedMs===T.DAY_MS){finishDay();return;}
   saveClock();updateClock();renderVisitorLog();
 }
 function startTimer(){
   if(clockTimer!==null)clearInterval(clockTimer);
   lastTick=monotonic();clockTimer=setInterval(pulse,250);
 }
 function updateClock(){
   if(!clock)return;
   $('gameClock').textContent=T.format(clock);
   $('clockProgress').textContent=T.progress(clock)+'%';
   $('clockBar').value=T.progress(clock);
   $('timeLabel').textContent=(clock.paused?(clock.elapsedMs?'一時停止中':'開店準備中'):'営業中')+' ｜ '+T.format(clock);
   const blocked=recoveryBlocked||onboardingRequired||state.day>180||!!state.pendingMonth;
   $('openBtn').disabled=blocked||!!live()?.pendingSeller||!clock.paused||clock.elapsedMs>=T.DAY_MS;
   $('openBtn').textContent=clock.elapsedMs?'営業を再開':'営業開始（15分）';
   $('pauseBtn').disabled=blocked||clock.paused;
   $('fastForwardBtn').disabled=blocked;
   $('timeMessage').textContent=state.pendingMonth?'月末の返済判断を完了してください。':
     (clockNotice||'スキップすると、残り時間の来客は発生せず、未成立の売買はなくなります。');
 }
 function beginDay(){
   if(recoveryBlocked||onboardingRequired||state.pendingMonth||state.day>180)return;
   if(!applyPlan())return;
   if(live()?.pendingSeller){clockNotice='来店中の売り手への対応が必要です。';refresh();return;}
   clockNotice='';clock=T.running(clock);saveClock();startTimer();updateClock();
 }
 function pauseDay(){stopClock();updateClock();}
 function finishDay(){
   if(recoveryBlocked||onboardingRequired||state.pendingMonth||state.day>180)return;
   if(clockTimer!==null)stopClock();
   // Skip closes now: unarrived buyers and sellers vanish; completed trades persist.
   try{
     const output=L.finish(state,live()??L.initial(state));
     state={...output.state,lastReport:output.report};lastReport=output.report;
     notice=output.report.sold?'本日販売できた商品があります。':'本日の販売は0点でした。';
     selectedRepairId=null;warehousePage=0;clock=T.initial(state.day);
     persist();saveClock();refresh();
     if(state.pendingMonth)$('monthPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
     else $('report').scrollIntoView({behavior:'smooth',block:'nearest'});
   }catch(error){clock=T.paused(clock);clockNotice=error.message;saveClock();updateClock();refreshBudget();}
 }
 function fastForwardDay(){clock=T.finish(clock);saveClock();finishDay();}
 function showMonth(){
   const panel=$('monthPanel');panel.hidden=!state.pendingMonth;
   if(!state.pendingMonth)return;
   const data=E.monthlySummary(state,state.pendingMonth.month);
   const money=value=>value===null?'旧セーブに明細がないため集計不可':yen(value);
   const root=$('monthSummary');root.replaceChildren();
   root.append(el('h3','',data.month+'か月目（'+data.startDay+'〜'+data.endDay+'営業日）'));
   for(const [title,num] of [['売上',data.revenue],['販売した商品の原価',data.cogs],
      ['家賃',data.rent],['修理の現金支出',data.repairSpending],
      ['機材の現金支出',data.equipmentCost],['当月発生利息',data.interestCharged],
      ['当月損益',data.operatingProfit],['当月売れた点数',data.sold],
      ['期末現金',data.endingCash],['残っている借入',data.debt]]){
       root.append(el('p','',title+'：'+(title.includes('点数')?String(num)+'点':money(num))));
   }
   if(!data.fullBreakdown)root.append(el('p','hint','旧形式の営業記録には売上・原価明細がないため、一部の内訳は集計できません。'));
   $('monthRepayment').disabled=!state.finance||E.financeSummary(state).totalDebt===0;
   $('monthPayBtn').disabled=!state.finance||E.financeSummary(state).totalDebt===0;
   $('monthSkipBtn').disabled=false;
   $('monthMessage').textContent=monthNotice||'今月の返済を見送り、来月の営業資金を残すこともできます。';
 }
 function decideMonthly(amount){
   try{
     if(!Number.isSafeInteger(amount)||amount<0)throw Error('返済額は0円以上の整数で指定してください。');
     const result=E.closeMonthlyReview(state,amount);
     state=result.state;monthNotice='';repayNotice=amount?'月末に'+yen(amount)+'返済しました。':'今月の返済は見送りました。';
     persist();refresh();
   }catch(error){monthNotice=error.message;showMonth();}
 }
 const yen=x=>'¥'+Math.round(x).toLocaleString('ja-JP');
 const el=(tag,klass,text)=>{const a=document.createElement(tag);if(klass)a.className=klass;if(text!==undefined)a.textContent=text;return a};
 function load(){let raw=null;try{raw=localStorage.getItem(KEY);if(!raw){onboardingRequired=true;return E.initial();}
    const loaded=E.validate(JSON.parse(raw));
    if(loaded.liveSession)L.validate(loaded,loaded.liveSession);
    lastReport=loaded.lastReport??null;return loaded;}
   catch(error){recoveryBlocked=true;originalRaw=raw;notice='保存済みのデータを確認できませんでした。元のセーブは保持しています。';return E.initial();}}
 function persist(){if(recoveryBlocked)return false;try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(error){notice='自動保存できませんでした。セーブ書き出しをご利用ください。';return false;}}
 function field(type,label,value,min=1,max=1000000){const wrap=el('label','',label),input=el('input');input.type='number';input.min=String(min);input.max=String(max);input.step='100';input.value=String(value);input.dataset.type=type;wrap.append(input);return {wrap,input};}
 function renderOffers(){const container=$('offers');container.replaceChildren();
   const active=live()?.pendingSeller??null;
   $('sellerRespondBtn').disabled=!active;
   $('sellerSkipBtn').disabled=!active;
   if(!active){
     container.append(el('p','hint','開店すると売り手が予定時刻に来店します。到着時に時間が止まり、買取額を決められます。'));
     return;
   }
   for(const item of E.offers(state).filter(x=>x.id===active)){
     const box=el('div','offer');box.append(el('h3','',item.name),el('div','grade','状態 '+item.grade));
     box.append(el('div','hint','来店 '+item.arrival+' ｜ '+item.sellerIcon+' '+item.sellerName));
     box.append(el('div','hint','売り手の希望額 '+yen(item.ask)));
     box.append(el('div','hint','目利きの評価目安 '+yen(item.fair)));
     const modeWrap=el('label','','買取方法'),mode=el('select');
     mode.dataset.offerMode=String(item.id);
     for(const [value,label] of [['fixed','希望額でそのまま買う'],['negotiate','価格を交渉する']]){
       const option=el('option','',label);option.value=value;mode.append(option);
     }
     mode.value='fixed';modeWrap.append(mode);box.append(modeWrap);
     const bid=field('bid','売り手への買取提示額',item.ask,100,item.ask);
     bid.input.dataset.offerBid=String(item.id);bid.input.disabled=true;box.append(bid.wrap);
     const fallbackWrap=el('label','','交渉が失敗した場合'),fallback=el('select');
     fallback.dataset.offerFallback=String(item.id);
     for(const [value,label] of Object.entries(E.FALLBACKS)){
       const option=el('option','',label);option.value=value;fallback.append(option);
     }
     fallback.value='walk';fallback.disabled=true;fallbackWrap.append(fallback);box.append(fallbackWrap);
     mode.addEventListener('change',()=>{
       const negotiating=mode.value==='negotiate';bid.input.disabled=!negotiating;fallback.disabled=!negotiating;
       refreshBudget();
     });
     bid.input.addEventListener('input',refreshBudget);fallback.addEventListener('change',refreshBudget);
     box.append(el('div','hint','交渉の成功率は提示額に応じて変わります。失敗したら、初期設定では買えません。'));
     const price=field('price','店頭で売る値段',item.defaultPrice);price.input.dataset.offerPrice=String(item.id);box.append(price.wrap);
     const label=el('label','toggle'),check=el('input');check.type='checkbox';check.dataset.offerId=String(item.id);label.append(check,document.createTextNode(' この商品を買い取る'));box.append(label);container.append(box);
   }
 }
 function renderInventory(){const root=$('inventory');root.replaceChildren();if(!storeItems().length){
     $('warehousePageLabel').textContent='📦 倉庫 0点';
     $('warehousePrev').disabled=true;$('warehouseNext').disabled=true;
     root.append(el('p','hint','まだ在庫がありません。来店した売り手から買い取りましょう。'));return;}
   const table=el('table'),head=el('thead'),tr=el('tr');for(const h of ['商品','保管場所・経過','状態','仕入原価','現在の販売価格','修理','売場に並べる','採算と販売の見込み'])tr.append(el('th','',h));head.append(tr);table.append(head);
   const stock=storeItems(),warehouse=stock.filter(p=>(p.zone??'shelf')==='warehouse');
   const maxPage=Math.max(0,Math.ceil(warehouse.length/9)-1);
   warehousePage=Math.min(warehousePage,maxPage);
   $('warehousePageLabel').textContent='📦 倉庫 '+(warehousePage+1)+' / '+(maxPage+1)+' （9点/ページ・全'+warehouse.length+'点）';
   $('warehousePrev').disabled=warehousePage===0;
   $('warehouseNext').disabled=warehousePage===maxPage;
   const showing=stock.filter(p=>p.zone!=='warehouse').concat(warehouse.slice(warehousePage*9,(warehousePage+1)*9));
   const body=el('tbody');for(const p of showing){const row=el('tr');row.append(el('td','',E.TYPES[p.type].name),
       el('td','hint',(p.zone==='warehouse'?'📦 倉庫':p.zone==='workshop'?'🔧 修理台':'🏬 売場')+
       ' ｜ 仕入後'+(p.ageDays??0)+'日'+
       (p.repairProgress!==undefined?' ｜ 整備 '+p.repairProgress+'%（'+(p.repairProgress<100?'現状品':'整備済み')+'）':'')),
       el('td','',p.grade),el('td','',yen(p.cost)));
     const inp=field('price','',p.price);inp.input.dataset.stockPrice=String(p.id);inp.input.setAttribute('aria-label',E.TYPES[p.type].name+'の販売価格');const td=el('td');td.append(inp.input);row.append(td);
     const rehab=el('td');
     if(p.grade!=='A'){
       const wrap=el('label','toggle'),check=el('input');
       check.type='checkbox';check.dataset.repairId=String(p.id);
       wrap.append(check,document.createTextNode(' 修理 '+yen(E.repairPrice(p,state.equipmentLevel??1))));
       check.disabled=p.zone==='workshop'||!!(p.zone==='workshop');
       rehab.append(wrap);
     }else rehab.textContent='最高状態';
     row.append(rehab);
     const listing=el('td');
     if(p.zone==='warehouse'){
       const label=el('label','toggle'),check=el('input');
       check.type='checkbox';check.dataset.listId=String(p.id);
       label.append(check,document.createTextNode(' 🏬 売場に出す'));listing.append(label);
     }else listing.textContent=p.zone==='workshop'?'修理完了待ち':'販売中';
     row.append(listing);
     const score=Math.min(.94,E.saleChance(p.type,p.grade,p.price,p.fair,state.day,state.reputation)*
       E.marketDemand(state.seed,state.day,p.type));
     const advice=E.safePrice(p,state);
     row.append(el('td','hint','個別の購買目安 '+Math.round(score*100)+'% ｜ 採算ライン目安 '+yen(advice.breakEven)+
       ' ｜ 利益目標 '+yen(advice.target)+(p.price<advice.breakEven?' ⚠ 採算割れのおそれ':'')));
     body.append(row);
   }table.append(body);root.append(table);
 }
 function plan(){const buy=[],prices=[],repairs=[],list=[];for(const check of document.querySelectorAll('[data-offer-id]'))if(check.checked){const id=Number(check.dataset.offerId);const mode=document.querySelector('[data-offer-mode="'+id+'"]').value;
     const fallback=document.querySelector('[data-offer-fallback="'+id+'"]').value;
     buy.push({id,price:Number(document.querySelector('[data-offer-price="'+id+'"]').value),
       mode,bid:Number(document.querySelector('[data-offer-bid="'+id+'"]').value),fallback});}
   for(const input of document.querySelectorAll('[data-stock-price]'))prices.push({id:Number(input.dataset.stockPrice),price:Number(input.value)});
   for(const checkbox of document.querySelectorAll('[data-repair-id]'))if(checkbox.checked)repairs.push(Number(checkbox.dataset.repairId));
   for(const checkbox of document.querySelectorAll('[data-list-id]'))if(checkbox.checked)list.push(Number(checkbox.dataset.listId));
   return {buy,prices,repairs,list,equipmentUpgrade:$('equipmentUpgrade')?.checked===true};}
 function refreshBudget(){const box=$('budget');box.className='budget';if(recoveryBlocked){box.classList.add('error');box.textContent='元のセーブの保護中です。セーブ管理から退避するか、新規開始してください。';$('openBtn').disabled=true;return;}
   try{const p=plan(),list=E.offers(state),total=p.buy.reduce((sum,item)=>{
      const offer=list.find(o=>o.id===item.id);
      if(!offer||!Number.isSafeInteger(item.price)||item.price<1||item.price>1e6)throw Error('販売価格は1〜100万円で指定してください。');
      if(!['fixed','negotiate'].includes(item.mode))throw Error('買取方法が不正です。');
      if(!Number.isSafeInteger(item.bid)||item.bid<100||item.bid>offer.ask)throw Error('買取提示額は100円以上、売り手の希望額以下で指定してください。');
      if(!Object.hasOwn(E.FALLBACKS,item.fallback))throw Error('交渉失敗時の方針が不正です。');
      return sum+(item.mode==='fixed'?offer.ask:Math.max(item.bid,E.counterPrice(offer.ask,item.fallback)));},0);
     for(const price of p.prices)if(!Number.isSafeInteger(price.price)||price.price<1||price.price>1e6)throw Error('販売価格は1〜100万円で指定してください。');
     const level=Math.min(2,(live()?.equipmentLevel??state.equipmentLevel??1)+Number(p.equipmentUpgrade));
     const spending=p.repairs.reduce((n,id)=>{const item=storeItems().find(x=>x.id===id);
       if(!item||item.zone==='workshop'||item.grade==='A')throw Error('修理できない在庫が含まれています。');
       return n+E.repairPrice(item,level);},0);
     const equipment=p.equipmentUpgrade?E.EQUIPMENT_UPGRADE_COST:0;
     if(p.equipmentUpgrade&&(state.equipmentLevel??1)>=2)throw Error('機材はすでに強化済みです。');
     if(p.repairs.length>level)throw Error('修理台の数が足りません。');
     const shelves=storeItems().filter(x=>(x.zone??'shelf')==='shelf'&&!p.repairs.includes(x.id)).length+
       p.list.length;
     if(shelves>E.SHELF_CAPACITY)throw Error('売場の陳列スペースが不足しています。');
     if(p.list.some(id=>p.repairs.includes(id)||!storeItems().some(x=>x.id===id&&x.zone==='warehouse')))throw Error('売場へ並べられない品物があります。');
     const remaining=shopCash()-total-spending-equipment-E.RENT;
     if(storeItems().length+p.buy.length>E.CAPACITY)throw Error('店の在庫スペースが足りません。');
     if(remaining<0)throw Error('今の仕入れ計画では家賃が払えません。');
     const plannedStock=storeItems().filter(x=>!p.repairs.includes(x.id) && ((x.zone??'shelf')==='shelf'||p.list.includes(x.id)));
     const demand=plannedStock.reduce((sum,item)=>sum+Math.min(.94,
       E.saleChance(item.type,item.grade,p.prices.find(x=>x.id===item.id)?.price??item.price,item.fair,state.day,state.reputation)*
       E.marketDemand(state.seed,state.day,item.type)),0);
     const expectedVisitors=E.customerArrivals(state).length;
     const negotiationItems=p.buy.filter(x=>x.mode==='negotiate');
     const chance=negotiationItems.map(x=>{
       const o=list.find(z=>z.id===x.id);return o.name+'：交渉成立見込み '+Math.round(E.offerProbability(o.ask,x.bid,o.seller)*100)+'%';
     }).join(' ｜ ');
     const expectedProcurement=p.buy.length-negotiationItems.length+
       negotiationItems.reduce((sum,x)=>{const o=list.find(z=>z.id===x.id);
         return sum+E.offerProbability(o.ask,x.bid,o.seller)+(1-E.offerProbability(o.ask,x.bid,o.seller))*(x.fallback==='walk'?0:1);
       },0);
     const marginAlerts=plannedStock.map(item=>{
       const plannedPrice=p.prices.find(x=>x.id===item.id)?.price??item.price;
       const advice=E.safePrice({...item,price:plannedPrice},state);
       return plannedPrice<advice.breakEven?E.TYPES[item.type].name+'：採算ライン目安'+yen(advice.breakEven)+'未満':'';
     }).filter(Boolean);
     box.textContent='必要資金の上限 '+yen(total)+' ＋ 修理 '+yen(spending)+' ＋ 機材 '+yen(equipment)+' ＋ 家賃 '+yen(E.RENT)+
       ' ｜ 最低残金 '+yen(remaining)+'。来客予定 '+expectedVisitors+'人（売り手を除く）'+
       ' ｜ 売場の購入見込み目安 '+Math.min(expectedVisitors,demand).toFixed(2)+'点/日。 '+
       ' ｜ 買取見込み '+expectedProcurement.toFixed(2)+'点。'+
       (chance?chance+'。 ':'')+(marginAlerts.length?' ⚠ '+marginAlerts.join('、')+'。':'')+
       (notice||' 売れなくても翌日に持ち越せます。');
     $('openBtn').disabled=recoveryBlocked||onboardingRequired||state.day>180||
       !!state.pendingMonth||!!live()?.pendingSeller||!!clock&&!clock.paused||
       !!clock&&clock.elapsedMs>=T.DAY_MS;
   }catch(error){box.classList.add('error');box.textContent=error.message;$('openBtn').disabled=true;}
 }
 function renderFinance(){
   const root=$('financeSummary');
   const details=E.financeSummary(state);
   const toolAssets=(live()?.ownedTools??state.ownedTools??[]).reduce((n,id)=>n+(L.TOOLS.find(t=>t.id===id)?.price??0),0);
   const assetValue=storeItems().reduce((n,item)=>n+item.cost,0)+
     ((live()?.equipmentLevel??state.equipmentLevel??1)>=2?E.EQUIPMENT_UPGRADE_COST:0)+toolAssets;
   const netWorth=shopCash()+assetValue-details.totalDebt;
   root.replaceChildren(
     el('p','',details.mode==='legacy'?'旧ルールのセーブ：この進行には借入金や返済義務を後付けしません。':
       '開業資金の提供者：'+details.label+' ｜ 開業時の借入 '+yen(details.openingPrincipal)),
     el('p','', '元金残高 '+yen(details.principal)+' ｜ 未払利息 '+yen(details.interestDue)+
       ' ｜ 現金 '+yen(shopCash())+' ｜ 在庫・機材の簿価目安 '+yen(assetValue)),
     el('p','', '参考純資産 '+yen(netWorth)+
       ' ｜ 返済期限 '+(details.deadline?details.deadline+'営業日':'返済は任意・または借入なし')),
     el('p','',details.nextInterestDay?'次の利息計上：'+details.nextInterestDay+'日目の営業終了時（元金残高の1%）':
       '新たな利息は発生しません。')
   );
   $('repayAmount').disabled=details.totalDebt===0||recoveryBlocked||onboardingRequired||!!live();
   $('repayBtn').disabled=details.totalDebt===0||recoveryBlocked||onboardingRequired||!!live();
   $('repayAllBtn').disabled=details.totalDebt===0||recoveryBlocked||onboardingRequired||!!live();
   $('repayMessage').textContent=repayNotice||(details.mandatory&&state.day>180&&details.totalDebt>0?
     '期限までに完済できませんでした。再挑戦する場合はセーブを保護して最初から始めてください。':'返済前に次の営業費用を残しておくことをおすすめします。');
 }
 function repayRequested(all){
   if(recoveryBlocked||onboardingRequired||live())return;
   try{
     const amount=all?E.financeSummary(state).totalDebt:Number($('repayAmount').value);
     if(!Number.isSafeInteger(amount)||amount<=0)throw Error('返済額には1円以上の整数を指定してください。');
     const out=E.repay(state,amount);
     state=out.state;repayNotice='返済 '+yen(amount)+'（利息 '+yen(out.report.interestPaid)+
       '、元金 '+yen(out.report.principalPaid)+'）。残り '+yen(out.report.remaining);
     persist();refresh();
   }catch(error){repayNotice=error.message;renderFinance();}
 }

 function renderVisitorLog(){
   const root=$('visitorLog'),progress=live();
   root.replaceChildren();
   if(!progress){root.append(el('p','hint','営業開始後に、来客と売買を時間順に表示します。'));return;}
   root.append(el('h3','','📋 今日の接客記録 ｜ 売上 '+yen(progress.revenue)+
     ' ｜ 買取 '+progress.bought+'点 ｜ 販売 '+progress.sold+'点'));
   for(const line of progress.logs.slice(-9))root.append(el('p','visitor-entry',line));
 }
 function renderWorkshop(){
   const root=$('workbench'),toolRoot=$('toolShop');
   root.replaceChildren();toolRoot.replaceChildren();
   const items=storeItems().filter(x=>x.zone==='workshop');
   if(!items.some(x=>x.id===selectedRepairId))selectedRepairId=items[0]?.id??null;
   root.append(el('h3','','🔧 修理台｜道具を選んで整備する'));
   if(!items.length)root.append(el('p','hint','現在、修理台は空いています。倉庫の商品を選び、「修理」にチェックして反映してください。'));
   const select=el('div','workbench-items');
   for(const item of items){
     const btn=el('button','repair-select',E.TYPES[item.type].name+'（'+(item.repairProgress??0)+'%）');
     btn.type='button';btn.addEventListener('click',()=>chooseRepair(item.id));
     if(item.id===selectedRepairId)btn.className+=' selected';
     select.append(btn);
   }
   root.append(select);
   const item=items.find(x=>x.id===selectedRepairId);
   if(item){
     const center=el('div','workbench-center');
     const icons={camera:'📷',console:'🎮',audio:'📻',book:'📚',car:'🚙'};
     const icon=el('div','repair-product',(icons[item.type]||'📦'));
     icon.className+=' dirt-'+((item.repairProgress??0)<50?'heavy':(item.repairProgress??0)<85?'medium':'light');
     center.append(el('p','hint','現在の作業対象：'+E.TYPES[item.type].name+'（状態 '+item.grade+'）'),icon);
     const progress=el('progress');progress.max=100;progress.value=item.repairProgress??0;
     progress.setAttribute('aria-label','修理進捗');center.append(progress,
       el('p','hint','汚れ・整備進捗 '+(item.repairProgress??0)+'% / 100%'));
     const interrupt=el('button','repair-stop','未完成のまま倉庫へ戻す');
     interrupt.type='button';interrupt.addEventListener('click',stopRepair);center.append(interrupt);
     root.append(center);
   }
   toolRoot.append(el('h3','','🧰 自分の所有工具（個別・まとめて定価購入）'));
   const controls=el('div','tool-list'),owned=live()?.ownedTools??state.ownedTools??['brush'];
   for(const tool of L.TOOLS){
     const have=owned.includes(tool.id);
     const button=el('button','tool-button',tool.icon+' '+tool.name+
       (have?' ｜ 所有中':' ｜ '+yen(tool.price)+'で購入'));
     button.type='button';
     button.disabled=have&&!item;
     button.addEventListener('click',()=>{if(have)useTool(tool.id);else buyTool(tool.id);});
     controls.append(button);
   }
   toolRoot.append(controls);
   const bundle=el('button','tool-bundle','不足している工具をすべて定価でそろえる');
   bundle.type='button';bundle.disabled=L.TOOLS.every(t=>owned.includes(t.id));
   bundle.addEventListener('click',buyToolset);toolRoot.append(bundle);
   toolRoot.append(el('p','hint','未完成でも倉庫へ戻し、状態を明示して販売可能。工具操作中は画面の時計が進むため、ゆっくり作業するなら一時停止できます。'));
 }
 function renderStats(){
   $('equipmentUpgrade').disabled=(live()?.equipmentLevel??state.equipmentLevel??1)>=2;
   if($('equipmentUpgrade').disabled)$('equipmentUpgrade').checked=false;
   $('equipmentLevel').textContent='修理設備 '+(live()?.equipmentLevel??state.equipmentLevel??1)+' / 2 ｜ 売場 '+E.SHELF_CAPACITY+'点 ｜ 全保管 '+E.CAPACITY+'点';
   $('visitorSchedule').textContent='本日の買い手 '+E.customerArrivals(state).length+'人 ＋ 持ち込み '+E.offers(state).length+'組 （ポアソン過程で時間順に来店）。対応済み '+(live()?.cursor??0)+'件';
   $('day').textContent=state.day>180?'完走':state.day+'日目';$('cash').textContent=yen(shopCash());$('stock').textContent=storeItems().length+' / '+E.CAPACITY+'点';$('sold').textContent=state.totalSold+'点 ｜ 評判 '+state.reputation;}
 function renderReport(){const root=$('report');root.replaceChildren();if(!lastReport){root.append(el('p','hint','営業後に、売れた品物・利益・売れ残りをここに表示します。'));return;}
   const fields=[['今日の売上',yen(lastReport.revenue)],['今日の利益',yen(lastReport.profit)],['売れた商品',lastReport.sold+'点'],['残った在庫',lastReport.inventory+'点']];
   const grid=el('div','report-grid');for(const [label,value]of fields){const box=el('div');box.append(el('div','hint',label),el('strong','',value));grid.append(box);}root.append(grid);
   const sold=lastReport.soldItems;
   const arrivals=lastReport.customers||[];
   root.append(el('p','hint','来店者 '+(lastReport.customerCount??arrivals.length)+'人 ｜ 売場販売 '+lastReport.sold+'点 ｜ 倉庫 '+(lastReport.warehouseCount??0)+'点 ｜ 修理台 '+(lastReport.workshopCount??0)+'点 ｜ 機材支出 '+yen(lastReport.equipmentCost??0)));
   for(const customer of arrivals.slice(0,12))root.append(el('p','customer-line',
     customer.arrival+' '+customer.icon+' '+customer.name+'：'+(customer.bought?customer.product+'を購入':'今回は購入せず')));
   const story=lastReport.sold>=2?'買い手が集まり、お店の評判が少しずつ高まっています。':lastReport.sold===1?'一点売れました。良い買い取り品を探してみましょう。':'売れ残りを抱えた一日。値段と在庫を見直すのが次の勝負です。';
   root.append(el('p','hint',story));
   if(state.inventory.length){
     const avgAge=state.inventory.reduce((n,x)=>n+(x.ageDays??0),0)/state.inventory.length;
     root.append(el('p','hint','残った品物は保管により摩耗します。平均保管日数 '+avgAge.toFixed(1)+'日。'));
   }
   root.append(el('p','hint','本日の修理：'+lastReport.repaired+'点 ｜ 修理支出 '+yen(lastReport.repairSpending)));
   root.append(el('p','hint','希望額との差額 '+yen(lastReport.negotiationSavings||0)+
     ' ｜ 不成立 '+(lastReport.rejectedOffers||[]).length+'件 ｜ 予想販売 '+(lastReport.expectedSales??0)+'点'));
   for(const n of lastReport.negotiations||[]){
     if(n.mode!=='negotiate')continue;
     const msg=n.accepted?n.name+'：'+yen(n.bid)+'で交渉成立。':
       n.fallback==='walk'?n.name+'：'+yen(n.bid)+'は断られ、今回は購入できませんでした。':
       n.name+'：交渉は失敗しましたが、事前に指定した金額 '+yen(n.cost)+' で購入しました。';
     root.append(el('p','hint',msg));
   }
   root.append(el('p','',sold.length?'売れた品：'+sold.map(x=>x.name+' '+yen(x.price)).join('、'):'今日は売れた商品がありません。価格や仕入れ品を見直しましょう。'));
 }
 function renderHistory(){const root=$('history');root.replaceChildren();for(const item of state.history.slice(-12).reverse())root.append(el('div','record',item.day+'日目 ｜ 販売 '+item.sold+'点 ｜ 利益 '+yen(item.profit)+' ｜ 現金 '+yen(item.cash)));}
 function refresh(){
   renderStats();renderOffers();renderInventory();renderWorkshop();renderVisitorLog();renderSound();renderReport();renderHistory();renderFinance();refreshBudget();showMonth();updateClock();
   $('openingScreen').hidden=!onboardingRequired;
   $('gameShell').hidden=onboardingRequired;
   if(onboardingRequired)$('openBtn').disabled=true;
   $('restoreBtn').disabled=!localStorage.getItem(BACKUP_KEY);
   $('restoreFromOpeningBtn').disabled=!localStorage.getItem(BACKUP_KEY);
 }
 function run(){beginDay();}
 function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function importSave(file){if(!file)return;try{if(file.size>250000)throw Error('セーブファイルが大きすぎます。');const raw=JSON.parse(await file.text());const next=E.validate(raw.state);if(raw.schema!==E.VERSION)throw Error('対応しないセーブ形式です。');if(!confirm('保存済みの進行状況に置き換えますか？'))return;stopClock();if(!recoveryBlocked&&localStorage.getItem(KEY))localStorage.setItem(BACKUP_KEY,JSON.stringify(state));
    if(next.liveSession)L.validate(next,next.liveSession);
    state=next;clock=raw.clock?T.validate(raw.clock,next.day):T.initial(next.day);
    if(live()){
      const floor=Math.round((live().minute-T.OPEN_MINUTES)/(T.CLOSE_MINUTES-T.OPEN_MINUTES)*T.DAY_MS);
      if(clock.elapsedMs<floor)clock={...clock,elapsedMs:floor,paused:true};
    }
    saveClock();onboardingRequired=false;recoveryBlocked=false;originalRaw=null;lastReport=null;repayNotice='';
    notice='保存内容を読み込みました。';persist();refresh();}catch(error){alert('セーブの読み込みに失敗しました：'+error.message);}}
 function startWithMode(){
   if(!onboardingRequired||recoveryBlocked)return;
   const selected=$('openingModeHard').checked?'hard':$('openingModeNormal').checked?'normal':'easy';
   try{
     state=E.startGame(selected);selectedRepairId=null;clock=T.initial(state.day);saveClock();
     onboardingRequired=false;lastReport=null;repayNotice='';notice='';
     if(!persist())throw Error('開業情報を保存できませんでした。別の場所に保存してください。');
     refresh();
   }catch(error){$('openingError').textContent=error.message;onboardingRequired=true;}
 }
 function resetToNewGame(){
   const warning=recoveryBlocked?
     '壊れたセーブの原文を別枠へ保管してから、新しい開業モード選択へ戻ります。よろしいですか？':
     '現在のプレイを別枠にバックアップし、開業モードを選び直しますか？';
   if(!confirm(warning))return;
   stopClock();
   try{
     const original=recoveryBlocked?originalRaw:localStorage.getItem(KEY);
     if(original!==null)localStorage.setItem(BACKUP_KEY,original);
     const timeRaw=localStorage.getItem(TIME_KEY);
     if(timeRaw!==null)localStorage.setItem(BACKUP_TIME_KEY,timeRaw);
     else localStorage.removeItem(BACKUP_TIME_KEY);
     localStorage.removeItem(KEY);localStorage.removeItem(TIME_KEY);
   }catch(error){alert('以前のセーブを保護できないためリセットしませんでした：'+error.message);return;}
   recoveryBlocked=false;originalRaw=null;state=E.initial();clock=T.initial(state.day);onboardingRequired=true;lastReport=null;
   repayNotice='';notice='';$('openingModeEasy').checked=true;
   $('openingModeNormal').checked=false;$('openingModeHard').checked=false;
   $('openingError').textContent='';refresh();
 }
 function restoreLastGame(){
   if(!confirm('現在の進行状況を前回のバックアップと入れ替えますか？'))return;
   try{
     const raw=localStorage.getItem(BACKUP_KEY);
     if(!raw)throw Error('復元できるバックアップがありません。');
     const restored=E.validate(JSON.parse(raw));
     if(restored.liveSession)L.validate(restored,restored.liveSession);
     const previousTime=localStorage.getItem(BACKUP_TIME_KEY);
     const restoredTime=previousTime?T.validate(JSON.parse(previousTime),restored.day):T.initial(restored.day);
     const current=localStorage.getItem(KEY);
     const originalTime=localStorage.getItem(TIME_KEY);
     if(current!==null)localStorage.setItem(BACKUP_KEY,current);
     else localStorage.removeItem(BACKUP_KEY);
     if(originalTime!==null)localStorage.setItem(BACKUP_TIME_KEY,originalTime);
     else localStorage.removeItem(BACKUP_TIME_KEY);
     stopClock();localStorage.setItem(KEY,raw);localStorage.setItem(TIME_KEY,JSON.stringify(restoredTime));
     state=restored;lastReport=restored.lastReport??null;clock=restoredTime;onboardingRequired=false;recoveryBlocked=false;originalRaw=null;lastReport=null;
     repayNotice='';notice='前回の進行を復元しました。';refresh();
   }catch(error){alert('セーブを復元できませんでした：'+error.message);}
 }
 function init(){state=load();clock=restoreClock();
   // Persist migrated *valid* clock saves immediately. Do not overwrite a
   // corrupted clock or unreadable finance save during recovery.
   if(!recoveryBlocked&&!onboardingRequired){persist();if(!clockNotice)saveClock();}
   refresh();
   document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseDay();});
   if(typeof window.addEventListener==='function')window.addEventListener('pagehide',()=>{pauseDay();});
   document.addEventListener('input',event=>{if(event.target.matches('input'))refreshBudget();});
   document.addEventListener('change',event=>{if(event.target.matches('input, select'))refreshBudget();});
   $('startGameBtn').addEventListener('click',startWithMode);
   $('repayBtn').addEventListener('click',()=>repayRequested(false));
   $('repayAllBtn').addEventListener('click',()=>repayRequested(true));
   $('restoreBtn').addEventListener('click',restoreLastGame);
   $('restoreFromOpeningBtn').addEventListener('click',restoreLastGame);
   $('openBtn').addEventListener('click',()=>{if(!recoveryBlocked&&!onboardingRequired)run();});
   $('pauseBtn').addEventListener('click',pauseDay);
   $('sellerRespondBtn').addEventListener('click',()=>answerSeller(true));
   $('sellerSkipBtn').addEventListener('click',()=>answerSeller(false));
   $('applyPlanBtn').addEventListener('click',applyPlan);
   $('soundToggleBtn').addEventListener('click',toggleSound);
   $('warehousePrev').addEventListener('click',()=>{warehousePage=Math.max(0,warehousePage-1);renderInventory();});
   $('warehouseNext').addEventListener('click',()=>{warehousePage++;renderInventory();});
   $('fastForwardBtn').addEventListener('click',fastForwardDay);
   $('monthPayBtn').addEventListener('click',()=>decideMonthly(Number($('monthRepayment').value)));
   $('monthSkipBtn').addEventListener('click',()=>decideMonthly(0));
   $('resetBtn').addEventListener('click',resetToNewGame);
   $('exportBtn').addEventListener('click',()=>download(recoveryBlocked?'used-shop-unreadable-original.json':'used-shop-day-'+state.day+'.json',recoveryBlocked&&originalRaw!==null?originalRaw:JSON.stringify({schema:E.VERSION,state,clock},null,2)));
   $('importBtn').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';void importSave(file);});
 }
 document.addEventListener('DOMContentLoaded',init);
})();
