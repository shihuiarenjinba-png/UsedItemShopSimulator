/* Free local shop art. Illustration never substitutes for actual inventory and tools. */
(() => {"use strict";
const SCENES=[
 ["warehouseStage","buy","買取カウンター","買取希望者が来店した時だけ人物を表示します。"],
 ["inventoryStage","stock","倉庫と売場の管理","商品・棚を中心に表示。倉庫内に来客の人物は描きません。"],
 ["workshopStage","repair","修理台と工具","ここでは選択済み商品と所有工具が主役です。"],
 ["openDayStage","day","営業カレンダー","営業時間・来客・スキップは既存の時計と連動します。"],
 ["financeStage","money","帳簿と返済","現金・借入・決算の数字を優先します。"],
 ["recordsStage","records","保存と営業履歴","記録画面に来客や店舗人物を出しません。"]
];
function start(){
 for(const [id,name,title,description] of SCENES){
  const host=document.getElementById(id);
  if(!host||host.querySelector(".shop-context"))continue;
  const scene=document.createElement("div");scene.className="shop-context";scene.dataset.scene=name;
  const art=document.createElement("div");art.className="shop-context-art";art.setAttribute("aria-hidden","true");
  ["floor","backdrop","fixture","item","item-second","figure"].forEach(shape=>{
    const part=document.createElement("span");part.className="shop-context-"+shape;art.append(part);
  });
  const detail=document.createElement("div");detail.className="shop-context-caption";
  const heading=document.createElement("h3");heading.textContent=title;
  const summary=document.createElement("p");summary.textContent=description;
  detail.append(heading,summary);scene.append(art,detail);host.insertBefore(scene,host.firstChild);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();