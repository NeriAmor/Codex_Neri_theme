import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
test('native plugin disable stops service; disabled MCP cannot restart it; re-enable works',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'neri-lifecycle-')),config=join(dir,'config.toml');
  const flag=value=>writeFileSync(config,`[plugins."neri-desktop-theme@neri-local"]\nenabled = ${value}\n\n[other]\nvalue = true\n`);
  flag(true);
  const child=spawn(process.execPath,[fileURLToPath(new URL('../codex/mcp.mjs',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,CODEX_PRISM_DATA_DIR:dir,CODEX_PRISM_DEBUG_PORT:'65534',NERI_PLUGIN_CONFIG:config}});
  const pending=new Map();let serial=0;
  createInterface({input:child.stdout}).on('line',line=>{const r=JSON.parse(line);pending.get(r.id)?.(r);pending.delete(r.id);});
  const request=()=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>reject(Error('MCP lifecycle timeout')),10000);pending.set(id,r=>{clearTimeout(timer);resolve(r);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method:'initialize',params:{}})+'\n');});
  const waitStopped=async()=>{for(let i=0;i<80&&existsSync(join(dir,'codex-server.json'));i++)await new Promise(r=>setTimeout(r,50));assert.equal(existsSync(join(dir,'codex-server.json')),false);};
  try{
    assert.ok((await request()).result);const first=JSON.parse(readFileSync(join(dir,'codex-server.json'))).pid;
    flag(false);await waitStopped();
    assert.match((await request()).error.message,/已禁用/);assert.equal(existsSync(join(dir,'codex-server.json')),false);
    flag(true);assert.ok((await request()).result);assert.notEqual(JSON.parse(readFileSync(join(dir,'codex-server.json'))).pid,first);
  }finally{flag(false);await waitStopped();child.stdin.end();}
});
