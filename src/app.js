/* Used Item Shop: one-screen, three-step offline interface. */
(function(){'use strict';
 const E=window.UsedItemShop,$=id=>document.getElementById(id),KEY='used-item-shop:save:v1';
 let state,notice='',recoveryBlocked=false,originalRaw=null,lastReport=null;
 const yen=x=>'¥'+Math.round(x).toLocaleString('ja-JP');
 const el=(tag,klass,text)=>{const a=document.createElement(tag);if(klass)a.className=klass;if(text!==undefined)a.textContent=text;return a};
 function load(){let raw=null;try{raw=localStorage.getItem(KEY);if(!raw)return E.initial();return E.validate(JSON.parse(raw));}
   catch(error){recoveryBlocked=true;originalRaw=raw;notice='保存済みのデータを確認できませんでした。元のセーブは保持しています。';return E.initial();}}
 function persist(){if(recoveryBlocked)return false;try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(error){notice='自動保存できませんでした。セーブ書き出しをご利用ください。';return false;}}
 function field(type,label,value,min=1,max=1000000){const wrap=el('label','',label),input=el('input');input.type='number';input.min=String(min);input.max=String(max);input.step='100';input.value=String(value);input.dataset.type=type;wrap.append(input);return {wrap,input};}
 function renderOffers(){const container=$('offers');container.replaceChildren();
   for(const item of E.offers(state)){
     const box=el('div','offer');box.append(el('h3','',item.name),el('div','grade','状態 '+item.grade));
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
 function renderInventory(){const root=$('inventory');root.replaceChildren();if(!state.inventory.length){root.append(el('p','hint','まだ在庫がありません。商品を買い取って販売を始めましょう。'));return;}
   const table=el('table'),head=el('thead'),tr=el('tr');for(const h of ['商品','状態','仕入原価','現在の販売価格','修理','売れやすさの目安'])tr.append(el('th','',h));head.append(tr);table.append(head);
   const body=el('tbody');for(const p of state.inventory){const row=el('tr');row.append(el('td','',E.TYPES[p.type].name),el('td','',p.grade),el('td','',yen(p.cost)));
     const inp=field('price','',p.price);inp.input.dataset.stockPrice=String(p.id);inp.input.setAttribute('aria-label',E.TYPES[p.type].name+'の販売価格');const td=el('td');td.append(inp.input);row.append(td);
     const rehab=el('td');
     if(p.grade!=='A'){
       const wrap=el('label','toggle'),check=el('input');
       check.type='checkbox';check.dataset.repairId=String(p.id);
       wrap.append(check,document.createTextNode(' 修理 '+yen(Math.max(100,Math.round(p.fair*0.12/100)*100))));
       rehab.append(wrap);
     }else rehab.textContent='最高状態';
     row.append(rehab);
     const score=Math.min(.94,E.saleChance(p.type,p.grade,p.price,p.fair,state.day,state.reputation)*
       E.marketDemand(state.seed,state.day,p.type));
     row.append(el('td','hint','翌日の販売見込み '+Math.round(score*100)+'% ｜ 保管 '+(p.ageDays??0)+'日'));body.append(row);
   }table.append(body);root.append(table);
 }
 function plan(){const buy=[],prices=[],repairs=[];for(const check of document.querySelectorAll('[data-offer-id]'))if(check.checked){const id=Number(check.dataset.offerId);const mode=document.querySelector('[data-offer-mode="'+id+'"]').value;
     const fallback=document.querySelector('[data-offer-fallback="'+id+'"]').value;
     buy.push({id,price:Number(document.querySelector('[data-offer-price="'+id+'"]').value),
       mode,bid:Number(document.querySelector('[data-offer-bid="'+id+'"]').value),fallback});}
   for(const input of document.querySelectorAll('[data-stock-price]'))prices.push({id:Number(input.dataset.stockPrice),price:Number(input.value)});
   for(const checkbox of document.querySelectorAll('[data-repair-id]'))if(checkbox.checked)repairs.push(Number(checkbox.dataset.repairId));
   return {buy,prices,repairs};}
 function refreshBudget(){const box=$('budget');box.className='budget';if(recoveryBlocked){box.classList.add('error');box.textContent='元のセーブの保護中です。セーブ管理から退避するか、新規開始してください。';$('openBtn').disabled=true;return;}
   try{const p=plan(),list=E.offers(state),total=p.buy.reduce((sum,item)=>{
      const offer=list.find(o=>o.id===item.id);
      if(!offer||!Number.isSafeInteger(item.price)||item.price<1||item.price>1e6)throw Error('販売価格は1〜100万円で指定してください。');
      if(!['fixed','negotiate'].includes(item.mode))throw Error('買取方法が不正です。');
      if(!Number.isSafeInteger(item.bid)||item.bid<100||item.bid>offer.ask)throw Error('買取提示額は100円以上、売り手の希望額以下で指定してください。');
      if(!Object.hasOwn(E.FALLBACKS,item.fallback))throw Error('交渉失敗時の方針が不正です。');
      return sum+(item.mode==='fixed'?offer.ask:Math.max(item.bid,E.counterPrice(offer.ask,item.fallback)));},0);
     for(const price of p.prices)if(!Number.isSafeInteger(price.price)||price.price<1||price.price>1e6)throw Error('販売価格は1〜100万円で指定してください。');
     const spending=p.repairs.reduce((n,id)=>{const item=state.inventory.find(x=>x.id===id);return n+Math.max(100,Math.round(item.fair*0.12/100)*100);},0);
     const remaining=state.cash-total-spending-E.RENT;
     if(state.inventory.length+p.buy.length>E.CAPACITY)throw Error('店の在庫スペースが足りません。');
     if(remaining<0)throw Error('今の仕入れ計画では家賃が払えません。');
     const demand=state.inventory.reduce((sum,item)=>sum+Math.min(.94,
       E.saleChance(item.type,item.grade,p.prices.find(x=>x.id===item.id)?.price??item.price,item.fair,state.day,state.reputation)*
       E.marketDemand(state.seed,state.day,item.type)),0);
     const chance=p.buy.filter(x=>x.mode==='negotiate').map(x=>{
       const o=list.find(z=>z.id===x.id);return o.name+'：交渉成立見込み '+Math.round(E.offerProbability(o.ask,x.bid)*100)+'%';
     }).join(' ｜ ');
     box.textContent='必要資金の上限 '+yen(total)+' ＋ 修理 '+yen(spending)+' ＋ 家賃 '+yen(E.RENT)+
       ' ｜ 最低残金 '+yen(remaining)+'。現在庫の予想販売数量 '+demand.toFixed(2)+'点/日。 '+
       (chance?chance+'。 ':'')+(notice||' 売れなくても翌日に持ち越せます。');
     $('openBtn').disabled=state.day>180;
   }catch(error){box.classList.add('error');box.textContent=error.message;$('openBtn').disabled=true;}
 }
 function renderStats(){$('day').textContent=state.day>180?'完走':state.day+'日目';$('cash').textContent=yen(state.cash);$('stock').textContent=state.inventory.length+' / '+E.CAPACITY+'点';$('sold').textContent=state.totalSold+'点 ｜ 評判 '+state.reputation;}
 function renderReport(){const root=$('report');root.replaceChildren();if(!lastReport){root.append(el('p','hint','営業後に、売れた品物・利益・売れ残りをここに表示します。'));return;}
   const fields=[['今日の売上',yen(lastReport.revenue)],['今日の利益',yen(lastReport.profit)],['売れた商品',lastReport.sold+'点'],['残った在庫',lastReport.inventory+'点']];
   const grid=el('div','report-grid');for(const [label,value]of fields){const box=el('div');box.append(el('div','hint',label),el('strong','',value));grid.append(box);}root.append(grid);
   const sold=lastReport.soldItems;
   const story=lastReport.sold>=2?'買い手が集まり、お店の評判が少しずつ高まっています。':lastReport.sold===1?'一点売れました。良い買い取り品を探してみましょう。':'売れ残りを抱えた一日。値段と在庫を見直すのが次の勝負です。';
   root.append(el('p','hint',story));
   if(state.inventory.length){
     const avgAge=state.inventory.reduce((n,x)=>n+(x.ageDays??0),0)/state.inventory.length;
     root.append(el('p','hint','残った品物は保管により摩耗します。平均保管日数 '+avgAge.toFixed(1)+'日。'));
   }
   root.append(el('p','hint','本日の修理：'+lastReport.repaired+'点 ｜ 修理支出 '+yen(lastReport.repairSpending)));
   root.append(el('p','hint','希望額との差額 '+yen(lastReport.negotiationSavings||0)+
     ' ｜ 不成立 '+(lastReport.rejectedOffers||[]).length+'件 ｜ 予想販売 '+(lastReport.expectedSales??0)+'点'));
   for(const rejected of lastReport.rejectedOffers||[])root.append(el('p','hint',rejected.name+'：'+yen(rejected.bid)+'の買取提示は断られました。'));
   root.append(el('p','',sold.length?'売れた品：'+sold.map(x=>x.name+' '+yen(x.price)).join('、'):'今日は売れた商品がありません。価格や仕入れ品を見直しましょう。'));
 }
 function renderHistory(){const root=$('history');root.replaceChildren();for(const item of state.history.slice(-12).reverse())root.append(el('div','record',item.day+'日目 ｜ 販売 '+item.sold+'点 ｜ 利益 '+yen(item.profit)+' ｜ 現金 '+yen(item.cash)));}
 function refresh(){renderStats();renderOffers();renderInventory();renderReport();renderHistory();refreshBudget();}
 function run(){try{const output=E.advance(state,plan());state=output.state;lastReport=output.report;notice=output.report.sold?'販売できました。次は仕入れと在庫のバランスを考えましょう。':'今日は販売ゼロ。過剰在庫に注意しましょう。';persist();refresh();$('report').scrollIntoView({behavior:'smooth',block:'nearest'});}catch(error){notice=error.message;refreshBudget();}}
 function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function importSave(file){if(!file)return;try{if(file.size>250000)throw Error('セーブファイルが大きすぎます。');const raw=JSON.parse(await file.text());const next=E.validate(raw.state);if(raw.schema!==E.VERSION)throw Error('対応しないセーブ形式です。');if(!confirm('保存済みの進行状況に置き換えますか？'))return;state=next;recoveryBlocked=false;originalRaw=null;lastReport=null;notice='保存内容を読み込みました。';persist();refresh();}catch(error){alert('セーブの読み込みに失敗しました：'+error.message);}}
 function init(){state=load();if(!recoveryBlocked)persist();refresh();
   document.addEventListener('input',event=>{if(event.target.matches('input'))refreshBudget();});
   document.addEventListener('change',event=>{if(event.target.matches('input'))refreshBudget();});
   $('openBtn').addEventListener('click',()=>{if(!recoveryBlocked)run();});
   $('resetBtn').addEventListener('click',()=>{if(!confirm(recoveryBlocked?'壊れたセーブを上書きして新規開始します。先に元データを退避しましたか？':'現在のデータを上書きして初めから始めます。よろしいですか？'))return;recoveryBlocked=false;originalRaw=null;state=E.initial();lastReport=null;notice='';persist();refresh();});
   $('exportBtn').addEventListener('click',()=>download(recoveryBlocked?'used-shop-unreadable-original.json':'used-shop-day-'+state.day+'.json',recoveryBlocked&&originalRaw!==null?originalRaw:JSON.stringify({schema:E.VERSION,state},null,2)));
   $('importBtn').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';void importSave(file);});
 }
 document.addEventListener('DOMContentLoaded',init);
})();
