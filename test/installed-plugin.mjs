import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const record=JSON.parse(readFileSync(join(homedir(),'.neri-desktop-theme/native-plugin-install.json'),'utf8'));
const expectedVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const packagePath=execFileSync('powershell.exe',['-NoProfile','-Command',"(Get-AppxPackage -Name OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1).InstallLocation"],{encoding:'utf8',windowsHide:true}).trim();
const cli=join(packagePath,'app/resources/codex.exe');
const plugins=JSON.parse(execFileSync(cli,['plugin','list','--marketplace','neri-local','--json'],{encoding:'utf8',windowsHide:true}));
const plugin=plugins.installed.find(p=>p.pluginId===record.pluginId);
assert.ok(plugin?.enabled);assert.equal(plugin.version,expectedVersion);
const servers=JSON.parse(execFileSync(cli,['mcp','list','--json'],{encoding:'utf8',windowsHide:true}));
const server=servers.find(s=>s.name==='neri_theme');assert.ok(server?.enabled);
const transport=server.transport;
assert.equal(resolve(transport.cwd),resolve(record.installedPath));
assert.ok(existsSync(resolve(transport.cwd,transport.args[0])));
assert.ok(!JSON.stringify(transport).includes('${PLUGIN_ROOT}'),'Installed MCP paths must resolve on this Codex build');
const child=spawn(transport.command,transport.args,{cwd:transport.cwd,env:{...process.env,...transport.env},windowsHide:true,stdio:['pipe','pipe','pipe']});
let requestId=0,stderr='';const pending=new Map();
child.stderr.on('data',b=>{stderr+=b;});
createInterface({input:child.stdout,crlfDelay:Infinity}).on('line',line=>{const response=JSON.parse(line);const p=pending.get(response.id);if(!p)return;pending.delete(response.id);clearTimeout(p.timer);response.error?p.reject(Error(JSON.stringify(response.error))):p.resolve(response.result);});
const request=(method,params={})=>new Promise((resolve,reject)=>{const id=++requestId;const timer=setTimeout(()=>reject(Error('Installed MCP timeout: '+stderr)),20000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
try{
  const init=await request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'prism-installed-test',version:'1'}});assert.equal(init.serverInfo.version,expectedVersion);
  const listed=await request('tools/list');assert.equal(listed.tools.length,6);
  const result=await request('tools/call',{name:'neri_status'});assert.ok(!result.isError);
  const status=JSON.parse(result.content[0].text);assert.ok(status.servicePid>0);assert.equal(status.host.connected,true);
  const report={pluginId:plugin.pluginId,version:plugin.version,enabled:plugin.enabled,mcpLaunchVerified:true,toolCount:listed.tools.length,connected:status.host.connected,cachePath:record.installedPath,limitation:'Cold start through the new direct native application shortcut requires reopening Codex; current app was not terminated.'};
  writeFileSync(new URL('../artifacts/installed-plugin-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{child.stdin.end();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));}
