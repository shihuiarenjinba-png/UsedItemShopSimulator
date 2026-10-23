"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const app=fs.readFileSync("src/app.js","utf8");
test("restoring the previous shop game retains its saved day report",()=>{
 const start=app.indexOf("function restoreLastGame(){");
 const end=app.indexOf("function init(){",start);
 assert.ok(start>=0&&end>start);
 const section=app.slice(start,end);
 assert.match(section,/lastReport=restored\.lastReport\?\?null/);
 const after=section.slice(section.indexOf("state=restored;"));
 assert.doesNotMatch(after,/lastReport\s*=\s*null/);
 const replay=new Function("restored","return restored.lastReport??null;");
 const report={sold:3,revenue:12000,profit:2000};
 assert.deepEqual(replay({lastReport:report}),report);
});
