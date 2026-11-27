import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {discoverSteamWeEnvironment} from '../src/engine/scanner.mjs';

// 每种启动方式都执行，而不只依赖安装脚本；丢失导入记录时可自动修复默认壁纸。
export async function prepareNeriLibrary(engine,dataDir,{firstRun=false}={}){
  const discovery=await discoverSteamWeEnvironment({cacheDir:join(dataDir,'cache')});
  const folders=[...new Set([...(discovery.workshopDirs||[]),...(discovery.defaultProjectsDirs||[]),...(discovery.myProjectsDirs||[])])];
  const marker=join(dataDir,'bundled-wallpaper.json');let defaultId='';
  try{defaultId=JSON.parse(readFileSync(marker,'utf8')).id||'';}catch{}
  const library=await engine.listLibrary();
  if(!defaultId||!library.items.some(i=>i.id===defaultId)){
    const result=await engine.uploadMedia({filename:'Neri.mp4',title:'默认音理壁纸 · 6K',streamOrBuffer:readFileSync(new URL('../assets/wallpapers/Neri.mp4',import.meta.url))});
    if(!result.item)throw Error('默认音理壁纸导入失败');
    defaultId=result.item.id;writeFileSync(marker,JSON.stringify({id:defaultId}));
  }
  engine.neriLibrary={defaultId,folders,wallpaperEngine:discovery.weInstallDir||''};
  if(firstRun){await engine.applyWallpaper(defaultId);await engine.updateConfig({skinEnabled:true,glassOpacity:.58,glassBlur:18});}
  return engine.neriLibrary;
}
