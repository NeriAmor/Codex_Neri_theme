import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function client(dataDir){
  const child=spawn(process.execPath,[fileURLToPath(new URL('../codex/mcp.mjs',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,CODEX_PRISM_DATA_DIR:dataDir,CODEX_PRISM_DEBUG_PORT:'65534'}});
  const pending=new Map();let id=0,stderr='';
  child.stderr.on('data',buffer=>{stderr+=buffer;});
  createInterface({input:child.stdout,crlfDelay:Infinity}).on('line',line=>{
    const response=JSON.parse(line);const entry=pending.get(response.id);if(!entry)return;pending.delete(response.id);clearTimeout(entry.timer);response.error?entry.reject(Error(JSON.stringify(response.error))):entry.resolve(response.result);
  });
  return {
    async request(method,params={}){const requestId=++id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('MCP timeout: '+stderr));},25000);pending.set(requestId,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:requestId,method,params})+'\n');});},
    async close(){child.stdin.end();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));},
  };
}
const value=result=>JSON.parse(result.content[0].text);
test('plugin initialization automatically starts one shared service and tools persist settings across service recovery',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'prism-native-plugin-'));
  const clients=[client(dir),client(dir)];
  async function stop(){try{const info=JSON.parse(await readFile(join(dir,'codex-server.json'),'utf8'));await fetch(`http://127.0.0.1:${info.port}/api/stop`,{method:'POST',headers:{'X-Prism-Token':info.token,'Content-Type':'application/json'},body:'{}'});for(let i=0;i<50;i++){try{await readFile(join(dir,'codex-server.json'));await new Promise(r=>setTimeout(r,100));}catch{break;}}}catch{}}
  try {
    const initialized=await Promise.all(clients.map(c=>c.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'prism-native-test',version:'1'}})));
    assert.ok(initialized.every(i=>i.serverInfo.name==='neri-desktop-theme'));
    const statuses=await Promise.all(clients.map(c=>c.request('tools/call',{name:'neri_status'}).then(value)));
    assert.ok(statuses[0].servicePid>0);assert.equal(statuses[0].servicePid,statuses[1].servicePid);
    const listed=await clients[0].request('tools/list');assert.ok(listed.tools.some(t=>t.name==='neri_open_settings'));
    const lib=value(await clients[0].request('tools/call',{name:'neri_list_wallpapers'}));assert.ok(lib.items.length>0);
    await clients[0].request('tools/call',{name:'neri_set_glass',arguments:{opacity:.42,blur:12}});
    let state=value(await clients[1].request('tools/call',{name:'neri_status'}));assert.equal(state.glassOpacity,.42);assert.equal(state.glassBlur,12);
    const invalid=await clients[0].request('tools/call',{name:'neri_set_glass',arguments:{opacity:.01}});assert.equal(invalid.isError,true);
    await clients[0].request('tools/call',{name:'neri_set_enabled',arguments:{enabled:false}});
    await stop();
    state=value(await clients[1].request('tools/call',{name:'neri_status'}));assert.notEqual(state.servicePid,statuses[0].servicePid);assert.equal(state.glassOpacity,.42);assert.equal(state.enabled,false);
  } finally {await stop();await Promise.all(clients.map(c=>c.close()));await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
});
