import { readFileSync, mkdirSync, openSync, closeSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginEnabled } from './plugin-lifecycle.mjs';

export const dataDirectory = () => process.env.CODEX_PRISM_DATA_DIR || join(homedir(), '.neri-desktop-theme');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function runningService() {
  try {
    const info = JSON.parse(readFileSync(join(dataDirectory(), 'codex-server.json'), 'utf8'));
    if (!Number.isInteger(info.pid) || !Number.isInteger(info.port) || info.port<1 || info.port>65535 || typeof info.token!=='string') return null;
    process.kill(info.pid, 0);
    const response = await fetch(`http://127.0.0.1:${info.port}/api/state`, { headers:{'X-Prism-Token':info.token}, signal:AbortSignal.timeout(1200) });
    if (!response.ok) return null;
    const state = await response.json();
    return state.pid === info.pid ? {info,state} : null;
  } catch { return null; }
}
export async function ensureService() {
  if(pluginEnabled(dataDirectory())===false)throw Error('音理主题插件已禁用，请先在插件页启用。');
  const existing = await runningService();
  if (existing) return existing;
  // 宿主可能保留旧MCP连接，而升级已清理旧版本缓存；按安装记录定位最新服务。
  let serverFile=fileURLToPath(new URL('./server.mjs',import.meta.url));
  try{
    const installed=JSON.parse(readFileSync(join(dataDirectory(),'native-plugin-install.json'),'utf8')).installedPath;
    const manifest=JSON.parse(readFileSync(join(installed,'.codex-plugin','plugin.json'),'utf8'));
    if(manifest.name==='neri-desktop-theme')serverFile=join(installed,'codex','server.mjs');
  }catch{}
  if(!existsSync(serverFile))throw Error('主题版本已更新，请重新连接插件。');
  const dataDir = dataDirectory(); mkdirSync(dataDir, { recursive:true });
  const lockPath = join(dataDir, 'plugin-service-start.lock');
  let ownLock = false;
  const deadline = Date.now()+15000;
  try {
    while (Date.now()<deadline) {
      const live = await runningService(); if(live) return live;
      try {
        const lock=openSync(lockPath,'wx');
        try { writeFileSync(lock,JSON.stringify({pid:process.pid})); } finally { closeSync(lock); }
        ownLock=true; break;
      } catch (e) {
        if(e.code!=='EEXIST')throw e;
        try { const owner=JSON.parse(readFileSync(lockPath,'utf8'));process.kill(owner.pid,0); }
        catch (error) { if(error.code==='ESRCH') { try { rmSync(lockPath); } catch {} } }
        await delay(150);
      }
    }
    if (!ownLock) throw new Error('Wallpaper service startup is busy; try again shortly.');
    const env={...process.env};
    for(const key of ['ELECTRON_RUN_AS_NODE','NODE_OPTIONS','NODE_PATH','NODE_REPL_EXTERNAL_MODULE'])delete env[key];
    const out=openSync(join(dataDir,'server.log'),'a');
    const err=openSync(join(dataDir,'server-error.log'),'a');
    let childError;
    try {
      const child=spawn(process.execPath,[serverFile],{detached:true,windowsHide:true,stdio:['ignore',out,err],env});
      child.on('error',error=>{childError=error;}); child.unref();
    } finally { closeSync(out);closeSync(err); }
    while(Date.now()<deadline){if(childError)throw childError;const live=await runningService();if(live)return live;await delay(150);}
    throw new Error('Wallpaper service did not become ready; see server-error.log.');
  } finally {
    if(ownLock){try{const owner=JSON.parse(readFileSync(lockPath,'utf8'));if(owner.pid===process.pid)rmSync(lockPath);}catch{}}
  }
}
export async function serviceRequest(path,body) {
  const {info}=await ensureService();
  const response=await fetch(`http://127.0.0.1:${info.port}/api/${path}`,{method:body===undefined?'GET':'POST',headers:{'X-Prism-Token':info.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const value=await response.json();if(!response.ok)throw new Error(value.error||`Wallpaper HTTP ${response.status}`);return value;
}
