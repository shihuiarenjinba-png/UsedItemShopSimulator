"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/shop.js"),T=require("../src/time.js");
const idle={buy:[],prices:[]};
const go=(raw,to)=>{let s=raw;while(s.day<to){if(s.pendingMonth)s=E.closeMonthlyReview(s,0).state;s=E.advance(s,idle).state;}return s;};
test("15 real minutes maps exactly to 10:00–19:00 with a deterministic pause",()=>{
 let t=T.initial(1);
 assert.equal(T.DAY_MS,900000);assert.equal(T.format(t),"10:00");
 assert.equal(T.tick(t,60000).elapsedMs,0);
 t=T.running(t);t=T.tick(t,450000);
 assert.equal(T.format(t),"14:30");
 assert.equal(T.progress(t),50);
 t=T.paused(t);
 assert.equal(T.tick(t,450000).elapsedMs,450000);
 assert.equal(T.format(T.finish(t)),"19:00");
 assert.equal(T.progress(T.finish(t)),100);
});
test("saved session reopens paused and elapsed time does not grow while offline",()=>{
 let t=T.tick(T.running(T.initial(9)),630000);
 const serialized=JSON.stringify(t);
 t=T.validate(JSON.parse(serialized),9);
 assert.equal(t.paused,true);
 assert.equal(t.elapsedMs,630000);
 assert.equal(T.format(t),"16:18");
 assert.deepEqual(T.tick(t,180000),t);
 assert.throws(()=>T.validate(JSON.parse(serialized),10),/時計|セーブ/);
 assert.throws(()=>T.validate({...t,elapsedMs:-1},9));
});
test("fast-forward and normal 15-minute end settle the same underlying economy",()=>{
 const s=E.startGame("normal",100),p={buy:[],prices:[]};
 const fast=T.finish(T.initial(s.day));
 let timed=T.running(T.initial(s.day));for(let i=0;i<90;i++)timed=T.tick(timed,10000);
 assert.equal(timed.elapsedMs,fast.elapsedMs);
 assert.deepEqual(E.advance(s,p),E.advance(E.validate(JSON.parse(JSON.stringify(s))),p));
});
test("day 30 generates auditable monthly breakdown and blocks the next day pending a decision",()=>{
 let s=go(E.startGame("normal",17),31);
 assert.deepEqual(s.pendingMonth,{month:1});
 assert.equal(s.history.length,30);
 const m=E.monthlySummary(s,1);
 assert.equal(m.month,1);assert.equal(m.startDay,1);assert.equal(m.endDay,30);
 assert.equal(m.revenue,0);assert.equal(m.sold,0);
 assert.equal(m.rent,30*E.RENT);
 assert.equal(m.procurement,0);
 assert.equal(m.operatingProfit,-30*E.RENT);
 assert.equal(m.endingCash,s.cash);
 assert.equal(m.fullBreakdown,true);
 assert.throws(()=>E.advance(s,idle),/月末/);
});
test("month-end player may skip payment while mandatory deadline remains unchanged",()=>{
 let s=go(E.startGame("normal",22),31);
 const before=s.cash;
 const review=E.closeMonthlyReview(s,0);
 s=review.state;
 assert.equal(s.cash,before);
 assert.equal(s.pendingMonth,undefined);
 assert.deepEqual(s.monthDecisions,[{month:1,day:31,amount:0}]);
 assert.equal(E.financeSummary(s).principal,700000);
 assert.equal(E.financeSummary(s).deadline,180);
 assert.throws(()=>E.closeMonthlyReview(s,0),/月次報告/);
 assert.equal(E.advance(s,idle).state.day,32);
});
test("month-end partial repayment subtracts cash and principal once only",()=>{
 let s=go(E.startGame("normal",19),31),cashBefore=s.cash;
 s=E.closeMonthlyReview(s,25000).state;
 assert.equal(s.cash,cashBefore-25000);
 assert.equal(s.finance.principal,675000);
 assert.equal(s.finance.repayments.at(-1).day,31);
 assert.equal(s.monthDecisions[0].amount,25000);
 assert.equal(E.validate(JSON.parse(JSON.stringify(s))).cash,s.cash);
 assert.throws(()=>E.closeMonthlyReview(s,25000));
});
test("hard month-end interest uses opening principal, repayment then reduces next period interest",()=>{
 let s=go(E.startGame("hard",52),31);
 assert.equal(s.finance.interestDue,7000);
 const m=E.monthlySummary(s,1);
 assert.equal(m.interestCharged,7000);
 const due=s.finance.interestDue;
 s=E.closeMonthlyReview(s,107000).state;
 assert.equal(s.finance.interestDue,0);
 assert.equal(s.finance.principal,600000);
 assert.equal(s.finance.repayments.at(-1).interestPaid,due);
 s=go(s,61);
 assert.equal(E.monthlySummary(s,2).interestCharged,6000);
 assert.equal(s.finance.interestDue,6000);
});
test("older saves have no invented sales breakdown and no retroactive loan",()=>{
 let s=E.initial(11);
 for(let i=0;i<30;i++)s=E.advance(s,idle).state;
 s.history.forEach(day=>{for(const key of ["revenue","procurement","cogs","rent","interestCharged","repairSpending","equipmentCost"])delete day[key]});
 const summary=E.monthlySummary(s,1);
 assert.equal(summary.revenue,null);
 assert.equal(summary.fullBreakdown,false);
 assert.equal(summary.operatingProfit,-30*E.RENT);
 assert.equal(E.financeSummary(s).totalDebt,0);
 const settled=E.closeMonthlyReview(s,0).state;
 assert.equal(settled.finance,undefined);
 assert.deepEqual(E.validate(settled),settled);
});
test("monthly repayments are not forced when cash must be retained for repairs and rent",()=>{
 let s=go(E.startGame("hard",34),31);
 const max=E.financeSummary(s).totalDebt;
 assert.throws(()=>E.closeMonthlyReview(s,max),/手元|現金/);
 const stillPending=E.closeMonthlyReview(s,0).state;
 assert.equal(stillPending.finance.principal,s.finance.principal);
 assert.equal(stillPending.cash,s.cash);
});

test("existing 20-minute mid-day save migrates to the same game clock time",()=>{
 const old={day:5,elapsedMs:840000,paused:false}; // 70% of 1,200,000 ms
 const migrated=T.validate(old,5);
 assert.equal(migrated.elapsedMs,630000);
 assert.equal(migrated.durationMs,900000);
 assert.equal(T.format(migrated),"16:18");
 assert.equal(migrated.paused,true);
 assert.deepEqual(T.validate(migrated,5),migrated);
 assert.equal(T.validate({day:5,elapsedMs:1200000,paused:true},5).elapsedMs,900000);
 assert.throws(()=>T.validate({...old,durationMs:2000000},5),/長さ/);
});
