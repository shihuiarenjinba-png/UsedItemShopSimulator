"use strict";const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const app=fs.readFileSync("src/app.js","utf8"),html=fs.readFileSync("index.html","utf8");
test("finish day reveals actual report tab; monthly settlement still takes priority",()=>{
 assert.match(app,/if\(state\.pendingMonth\)\$\('monthPanel'\)\.scrollIntoView/);
 assert.match(app,/window\.ShopScreens\?\.select\('day'\)/);
 assert.match(app,/\$\('report'\)\.scrollIntoView/);
});
test("explicit inventory operation guides repair without auto-switching on business-day start",()=>{
 assert.match(app,/function applyPlan\(revealRepair=false\)/);
 assert.match(app,/if\(revealRepair&&requested\.repairs\.length\)window\.ShopScreens\?\.select\('repair'\)/);
 assert.match(app,/if\(!applyPlan\(\)\)return/);
 assert.match(app,/addEventListener\('click',\(\)=>applyPlan\(true\)\)/);
 assert.match(app,/workbenchNotice/);
 assert.match(app,/feedback\.setAttribute\('role','status'\)/);
 assert.match(html,/id="workshopStage"/);
});