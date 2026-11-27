import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { createWallpaperPrismEngine } from '../src/engine/index.mjs';
import { createCodexBridge } from './bridge.mjs';
import { pluginEnabled } from './plugin-lifecycle.mjs';
import { prepareNeriLibrary } from './library-bootstrap.mjs';

export const defaultDataDir = () => process.env.CODEX_PRISM_DATA_DIR || join(homedir(), '.neri-desktop-theme');
export function openUrl(url) {
  execFile('powershell.exe', ['-NoProfile','-NonInteractive','-Command', `Start-Process -FilePath '${url.replace(/'/g,"''")}'`], { windowsHide: true }, () => {});
}
export async function createCodexServer({ dataDir = defaultDataDir(), debugPort = 9340, port = 0, connect = true, open = openUrl } = {}) {
  if(connect&&pluginEnabled(dataDir)===false)throw Error('音理主题插件已禁用，不能启动外观服务。');
  const firstRun=!existsSync(join(dataDir,'config.json'));
  mkdirSync(dataDir,{ recursive:true });
  const engine = await createWallpaperPrismEngine({ dataDir, allowLegacyMigration:false, keepAlive:true });
  if(connect)await prepareNeriLibrary(engine,dataDir,{firstRun});
  const token = randomBytes(32).toString('hex');
  const files = { '/':'studio.html', '/studio.js':'studio.js', '/studio.css':'studio.css' };
  let studioUrl;
  const bridge = createCodexBridge({ engine, port:debugPort, openStudio:() => open(studioUrl) });
  const json = (res, value, code=200) => { res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value)); };
  const server = createServer(async(req,res) => {
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      if (req.headers.host !== new URL(base).host) return json(res,{error:'Invalid host'},403);
      const url = new URL(req.url,base);
      if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
      if (files[url.pathname] && req.method === 'GET') {
        const name = files[url.pathname];
        res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; img-src 'self' http://127.0.0.1:* data:; media-src http://127.0.0.1:*; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'",'Referrer-Policy':'no-referrer'});
        return res.end(readFileSync(new URL(name,import.meta.url)));
      }
      const provided = Buffer.from(String(req.headers['x-prism-token']||''));
      const expected = Buffer.from(token);
      if(provided.length!==expected.length || !timingSafeEqual(provided,expected))return json(res,{error:'Unauthorized'},401);
      if(req.headers.origin && req.headers.origin!==base)return json(res,{error:'Origin forbidden'},403);
      if(req.method==='GET' && url.pathname==='/api/state') return json(res,{...engine.getActivePayload(),host:bridge.getStatus()});
      if(req.method==='GET' && url.pathname==='/api/library') return json(res,await engine.listLibrary());
      if(req.method!=='POST')return json(res,{error:'Not found'},404);
      if(url.pathname==='/api/upload') {
        const filename=decodeURIComponent(String(req.headers['x-filename']||'wallpaper.png'));
        return json(res,await engine.uploadMedia({filename,contentType:req.headers['content-type'],streamOrBuffer:req,title:filename}));
      }
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>1024*1024){json(res,{error:'Request too large'},413);return;}chunks.push(chunk);}
      const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
      if(url.pathname==='/api/config')await engine.updateConfig(body);
      else if(url.pathname==='/api/apply')await engine.applyWallpaper(body.id);
      else if(url.pathname==='/api/next')await engine.stepPlaylist(1);
      else if(url.pathname==='/api/scan')await engine.listLibrary({refresh:true});
      else if(url.pathname==='/api/restore')await engine.restoreSkin();
      else if(url.pathname==='/api/panel')await bridge.showPanel();
      else if(url.pathname==='/api/stop') {json(res,{ok:true});setTimeout(()=>void close(),30);return;}
      else return json(res,{error:'Not found'},404);
      void bridge.tick();
      json(res,{ok:true});
    } catch(e) { if(!res.headersSent)json(res,{error:e.message},400);else res.end(); }
  });
  await new Promise((r,j)=>{server.once('error',j);server.listen(port,'127.0.0.1',r);});
  studioUrl=`http://127.0.0.1:${server.address().port}/#${token}`;
  const infoPath=join(dataDir,'codex-server.json');
  writeFileSync(infoPath,JSON.stringify({pid:process.pid,url:studioUrl,port:server.address().port,token,debugPort},null,2));
  if(connect)await bridge.start();
  let closing=false;
  const lifecycleTimer=connect?setInterval(()=>{if(pluginEnabled(dataDir)===false)void close();},300):null;
  async function close(){if(closing)return;closing=true;clearInterval(lifecycleTimer);await bridge.stop();await engine.close();server.closeAllConnections();await new Promise(r=>server.close(r));if(existsSync(infoPath))rmSync(infoPath);}
  return { engine,bridge,server,studioUrl,token,close };
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const instance=await createCodexServer({debugPort:Number(process.env.CODEX_PRISM_DEBUG_PORT||9340)});
  console.log('Neri Desktop Theme service started.');
  if(process.argv.includes('--open'))await instance.bridge.showPanel();
  process.once('SIGINT',()=>void instance.close());process.once('SIGTERM',()=>void instance.close());
}
