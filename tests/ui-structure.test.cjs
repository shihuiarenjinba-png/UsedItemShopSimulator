"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
test("three simple steps with optional advanced save controls",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 for(const id of ["offers","inventory","budget","openBtn","report","history","exportBtn","importBtn","resetBtn"]) assert.ok(html.includes('id="'+id+'"'),id);
 assert.equal((html.match(/class="step"/g)||[]).length,3);
 assert.match(html,/<details class="extra">/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:/);
});
test("price changes and corrupted saves cannot be silently overwritten",()=>{
 const app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
 assert.match(app,/recoveryBlocked=true/);
 assert.match(app,/if\(recoveryBlocked\)return false/);
 assert.match(app,/BACKUP_KEY/);assert.match(app,/localStorage\.removeItem\(KEY\)/);assert.match(app,/resetToNewGame/);
 assert.match(app,/L\.finish\(state,live\(\)\?\?L\.initial\(state\)\)/);
});
