/* Accessible shop station navigation. Moves only the view; all shop logic remains in app.js. */
(() => {
 "use strict";
 const NAMES=["home","buy","stock","repair","day","money","records"];
 let current="home",monthReady=false,sellerWaiting=false;
 const get=id=>document.getElementById(id);
 const tabs=()=>Array.from(document.querySelectorAll("#shopTabs [data-shop-tab]"));
 const panels=()=>Array.from(document.querySelectorAll("[data-shop-screen]"));
 function select(name,{focus=false,scroll=false}={}){
  if(!NAMES.includes(name))return false;
  current=name;
  for(const element of panels()){
   const visible=element.dataset.shopScreen===name&&(element.id!=="monthPanel"||monthReady);
   element.hidden=!visible;
   element.setAttribute("aria-hidden",String(!visible));
  }
  for(const button of tabs()){
   const active=button.dataset.shopTab===name;
   button.setAttribute("aria-selected",String(active));
   button.tabIndex=active?0:-1;
   button.classList.toggle("selected",active);
   if(active&&focus)button.focus();
  }
  const records=get("recordsStage");
  if(name==="records")records.querySelector("details").open=true;
  document.body.dataset.shopCurrentTab=name;
  document.body.dataset.shopSeller=String(sellerWaiting);
  if(scroll)get("shopTabs").scrollIntoView({block:"start",behavior:"instant"});
  return true;
 }
 function update({month=false,seller=false}={}){
  monthReady=!!month;sellerWaiting=!!seller;
  if(monthReady&&current!=="money")return select("money");
  if(sellerWaiting&&!monthReady&&current!=="buy")return select("buy");
  return select(current);
 }
 function init(){
  const list=get("shopTabs");if(!list)return;
  monthReady=!get("monthPanel").hidden;
  sellerWaiting=!get("sellerRespondBtn").disabled;
  list.addEventListener("click",event=>{
   const btn=event.target.closest("[data-shop-tab]");
   if(btn)select(btn.dataset.shopTab,{scroll:false});
  });
  list.addEventListener("keydown",event=>{
   if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
   event.preventDefault();
   const index=NAMES.indexOf(current);
   const target=event.key==="Home"?0:event.key==="End"?NAMES.length-1:
    (index+(event.key==="ArrowUp"||event.key==="ArrowLeft"?-1:1)+NAMES.length)%NAMES.length;
   select(NAMES[target],{focus:true});
  });
  document.addEventListener("click",event=>{
   const jump=event.target.closest("[data-shop-open]");
   if(jump){select(jump.dataset.shopOpen,{scroll:true});return;}
   const a=event.target.closest('a[href^="#"]');if(!a)return;
   const id=a.getAttribute("href").slice(1),target=document.getElementById(id);
   const screen=target?.closest("[data-shop-screen]");
   if(!screen)return;
   event.preventDefault();select(screen.dataset.shopScreen,{scroll:true});
  });
  window.ShopScreens=Object.freeze({select,update,current:()=>current});
  select(monthReady?"money":sellerWaiting?"buy":"home");
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();