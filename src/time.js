/* Offline 20-minute game-day pacing. No wall-clock catch-up after leaving. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ShopTime=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const DAY_MS=20*60*1000, OPEN_MINUTES=10*60,CLOSE_MINUTES=19*60;
 function integer(n,label,min,max){
  if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+"は不正です。");
  return n;
 }
 function initial(day){integer(day,"営業日",1,181);return {day,elapsedMs:0,paused:true};}
 function validate(raw,day){
  integer(day,"営業日",1,181);
  if(!raw||raw.day!==day||typeof raw.paused!=="boolean")throw Error("営業時計のセーブが不正です。");
  integer(raw.elapsedMs,"進行時間",0,DAY_MS);
  return {day,elapsedMs:raw.elapsedMs,paused:true}; // reopen paused, never catch up offline
 }
 function running(clock){return {...clock,paused:false};}
 function paused(clock){return {...clock,paused:true};}
 function tick(clock,deltaMs){
  integer(deltaMs,"実時間",0,DAY_MS);
  if(clock.paused)return clock;
  const elapsedMs=Math.min(DAY_MS,clock.elapsedMs+deltaMs);
  return {...clock,elapsedMs,paused:elapsedMs===DAY_MS};
 }
 function finish(clock){return {...clock,elapsedMs:DAY_MS,paused:true};}
 function gameMinutes(clock){return OPEN_MINUTES+Math.floor(clock.elapsedMs*(CLOSE_MINUTES-OPEN_MINUTES)/DAY_MS);}
 function format(clock){const m=gameMinutes(clock);return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");}
 function progress(clock){return Math.floor(clock.elapsedMs/DAY_MS*100);}
 return Object.freeze({DAY_MS,OPEN_MINUTES,CLOSE_MINUTES,initial,validate,running,paused,tick,finish,format,progress});
});
