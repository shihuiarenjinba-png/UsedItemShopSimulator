"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),E=require("../src/shop.js");
const idle={buy:[],prices:[]};
function advanceTo(state,day){let s=state;while(s.day<day)s=E.advance(s,idle).state;return s;}
test("three funding modes start with 700000 yen in cash, 700000 debt and zero initial equity",()=>{
 for(const mode of Object.keys(E.FINANCE_MODES)){
  const s=E.startGame(mode,13),f=E.financeSummary(s);
  assert.equal(s.cash,700000);assert.equal(f.principal,700000);
  assert.equal(f.totalDebt,700000);assert.equal(s.cash-f.totalDebt,0);
  assert.equal(f.mode,mode);
  assert.equal(f.mandatory,mode!=="easy");
  assert.deepEqual(E.validate(s),s);
 }
 assert.throws(()=>E.startGame("anything"),/開業モード/);
});
test("mode stays immutable across advances, repayments and save round trips",()=>{
 for(const mode of ["easy","normal","hard"]){
  let s=E.startGame(mode,19);
  s=E.advance(s,idle).state;
  s=E.repay(s,12000).state;
  s=E.validate(JSON.parse(JSON.stringify(s)));
  assert.equal(s.finance.mode,mode);
  assert.equal(E.financeSummary(s).principal,688000);
  assert.equal(s.day,2);
 }
});
test("an old save is not silently assigned any loan or interest",()=>{
 let s=E.initial(18);
 s=advanceTo(s,32);
 assert.equal(s.finance,undefined);
 const restored=E.validate(JSON.parse(JSON.stringify(s)));
 assert.equal(E.financeSummary(restored).mode,"legacy");
 assert.equal(E.financeSummary(restored).totalDebt,0);
 assert.throws(()=>E.repay(restored,1000),/旧ルール/);
});
test("easy has optional payment, normal mandatory but both are interest-free",()=>{
 for(const mode of ["easy","normal"]){
  let s=advanceTo(E.startGame(mode,15),61);
  assert.equal(s.finance.interestDue,0);
  assert.equal(s.finance.interestCharges.length,0);
  const f=E.financeSummary(s);
  assert.equal(f.mandatory,mode==="normal");
  assert.equal(f.totalDebt,700000);
 }
});
test("hard charges exactly 1% of outstanding principal after every 30 completed days",()=>{
 const s=advanceTo(E.startGame("hard",10),61);
 assert.deepEqual(s.finance.interestCharges,[{day:30,amount:7000},{day:60,amount:7000}]);
 assert.equal(s.finance.interestDue,14000);
 assert.equal(s.finance.principal,700000);
 assert.equal(E.financeSummary(s).nextInterestDay,90);
});
test("repayment applies interest first and reduces later simple interest; it does not advance days",()=>{
 let s=advanceTo(E.startGame("hard",10),31);
 assert.equal(s.finance.interestDue,7000);
 const cash=s.cash,first=E.repay(s,107000);
 assert.equal(first.report.interestPaid,7000);
 assert.equal(first.report.principalPaid,100000);
 assert.equal(first.state.cash,cash-107000);
 assert.equal(first.state.day,31);
 assert.equal(first.state.finance.principal,600000);
 assert.equal(first.state.finance.interestDue,0);
 s=advanceTo(first.state,61);
 assert.equal(s.finance.interestCharges[1].amount,6000);
 assert.equal(s.finance.interestDue,6000);
 assert.equal(E.validate(JSON.parse(JSON.stringify(s))).cash,s.cash);
});
test("cash cannot become negative and overpayment is rejected without mutating state",()=>{
 const s=E.startGame("normal",12),before=JSON.stringify(s);
 assert.throws(()=>E.repay(s,700001),/手元/);
 assert.throws(()=>E.repay(s,0),/返済額/);
 assert.throws(()=>E.repay(s,1.5),/整数/);
 assert.equal(JSON.stringify(s),before);
 const debtFree=E.repay(s,700000).state;
 assert.equal(debtFree.finance.principal,0);
 assert.equal(debtFree.cash,0);
 assert.throws(()=>E.repay(debtFree,1),/手元|残り/);
});
test("corrupt loan balance, interest ledger, payment ordering or cash entries are refused",()=>{
 let s=E.repay(E.startGame("hard",50),50000).state;
 for(const field of ["principal","interestDue"]){
  const invalid=structuredClone(s);invalid.finance[field]+=100;
  assert.throws(()=>E.validate(invalid),/一致/);
 }
 const invalid=structuredClone(s);invalid.finance.repayments[0].cashAfter+=1;
 assert.throws(()=>E.validate(invalid),/台帳/);
 const fake=structuredClone(s);fake.finance.mode="nope";
 assert.throws(()=>E.validate(fake),/不正/);
 s=advanceTo(s,31);
 const charge=structuredClone(s);charge.finance.interestCharges[0].amount+=1;
 assert.throws(()=>E.validate(charge),/利息台帳/);
});
test("principal is not added twice to cash while interest expense affects profit on billing days",()=>{
 let s=advanceTo(E.startGame("hard",23),30);
 const before=s.cash;
 const result=E.advance(s,idle);
 assert.equal(result.report.interestCharged,7000);
 assert.equal(result.report.profit,-E.RENT-7000);
 assert.equal(result.state.cash,before-E.RENT);
 assert.equal(result.state.finance.interestDue,7000);
 assert.equal(result.state.history[29].profit,-E.RENT-7000);
});
