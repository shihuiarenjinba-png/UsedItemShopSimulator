const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('src/app.js','utf8'),css=fs.readFileSync('style.css','utf8');
test('shop floor has real accessible links to functional stations',()=>{
 for(const id of ['shopMapTitle','sceneStatus','sceneClock','sceneSeller','sceneWorkshop','sceneShelf','sceneVisitors'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/href="#warehouseStage"/);assert.match(html,/href="#workshopStage"/);
 assert.match(html,/aria-labelledby="shopMapTitle"/);
});
test('illustrated scene uses live state rather than its own unsaved counters',()=>{
 assert.match(app,/function renderShopFloor\(\)/);
 assert.match(app,/const session=live\(\),items=storeItems\(\)/);
 assert.match(app,/session\?\.pendingSeller/);
 assert.match(app,/renderStats\(\);renderShopFloor\(\)/);
 assert.match(app,/sceneClock'\)\.textContent=T\.format\(clock\)/);
 assert.match(css,/\.shop-map-grid\{/);
});
