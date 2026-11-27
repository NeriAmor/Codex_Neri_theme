import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCodexServer } from '../codex/server.mjs';
import { appFileUrl, nativePayload, selectCodexTargets } from '../codex/bridge.mjs';

test('only Codex main windows are eligible for wallpaper injection',()=>{
  const urls=['app://-/index.html','app://-/index.html?windowId=1','app://-/','app://-/detached-window.html','app://-/application-network','https://chatgpt.com','http://127.0.0.1:1234/','devtools://devtools/'];
  const targets=urls.map(url=>({type:'page',url,webSocketDebuggerUrl:'ws://127.0.0.1:9340/devtools/page/1'}));
  assert.deepEqual(selectCodexTargets(targets).map(t=>t.url),urls.slice(0,3));
  assert.equal(selectCodexTargets([{type:'page',url:'app://-/index.html?initialRoute=%2Favatar-overlay',webSocketDebuggerUrl:'ws://127.0.0.1:9340/overlay'}]).length,0);
  assert.equal(appFileUrl('E:\\壁纸\\a #%.mp4'),'app://fs/@fs/E%3A/%E5%A3%81%E7%BA%B8/a%20%23%25.mp4');
});
test('real upload, persistence, native playback path, authentication, and restore',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'codex-prism-test-'));
  let app;
  try {
    app=await createCodexServer({dataDir:dir,connect:false});
    const base=new URL(app.studioUrl).origin;
    const call=async(path,body,headers={})=>fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'X-Prism-Token':app.token,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
    assert.equal((await fetch(base+'/api/state')).status,401);
    assert.equal((await call('config',{glassOpacity:.53},{Origin:'https://attacker.invalid'})).status,403);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9sAAAAASUVORK5CYII=','base64');
    const upload=await fetch(base+'/api/upload',{method:'POST',headers:{'X-Prism-Token':app.token,'X-Filename':encodeURIComponent('测试 #.png'),'Content-Type':'image/png'},body:png});
    assert.equal(upload.status,200);const uploaded=await upload.json();assert.ok(uploaded.item?.id);
    assert.equal((await call('apply',{id:uploaded.item.id})).status,200);
    const payload=await nativePayload(app.engine);assert.equal(payload.kind,'image');assert.match(payload.url,/^app:\/\/fs\/@fs\//);assert.equal(payload.enabled,true);
    assert.equal((await call('config',{glassOpacity:.53})).status,200);
    await call('restore',{});assert.equal(app.engine.getConfig().skinEnabled,false);
    await app.close();app=await createCodexServer({dataDir:dir,connect:false});
    assert.equal(app.engine.getConfig().glassOpacity,.53);assert.equal(app.engine.getConfig().skinEnabled,false);
    assert.ok((await app.engine.listLibrary()).items.some(i=>i.id===uploaded.item.id));
  } finally {await app?.close();await rm(dir,{recursive:true,force:true});}
});
