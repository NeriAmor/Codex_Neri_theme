import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CdpSession,listCdpTargets } from '../sidecars/prism_studio/cdp-bridge.mjs';

const dir=await mkdtemp(join(tmpdir(),'prism-file-access-'));
const file=join(dir,'selected-image.png');
await writeFile(file,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9sAAAAASUVORK5CYII=','base64'));
let session;
try {
  const target=(await listCdpTargets(9340)).find(t=>t.url==='app://-/index.html');
  assert.ok(target,'Actual Codex main window is required');
  session=await CdpSession.connect(target.webSocketDebuggerUrl);
  const input=await session.send('Runtime.evaluate',{expression:`(()=>{const input=document.createElement('input');input.type='file';input.id='prism-native-file-check';input.hidden=true;document.body.append(input);return input})()`,returnByValue:false,objectGroup:'prism-file-check'});
  await session.send('DOM.setFileInputFiles',{files:[file],objectId:input.result.objectId});
  const selected=await session.send('Runtime.evaluate',{expression:`document.getElementById('prism-native-file-check').files[0]`,returnByValue:false,objectGroup:'prism-file-check'});
  const native=await session.send('DOM.getFileInfo',{objectId:selected.result.objectId});
  assert.equal(resolve(native.path).toLowerCase(),resolve(file).toLowerCase());
  console.log('Native selected-file access: 1 passed, 0 failed.');
} finally {
  if(session){await session.evaluate(`document.getElementById('prism-native-file-check')?.remove()`).catch(()=>{});await session.send('Runtime.releaseObjectGroup',{objectGroup:'prism-file-check'}).catch(()=>{});session.close();}
  await rm(dir,{recursive:true,force:true});
}
