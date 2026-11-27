import {readFileSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';

// 读取宿主的持久化插件开关；隔离测试/开发数据目录不受真实用户配置影响。
export function pluginEnabled(dataDir){
  if(!process.env.NERI_PLUGIN_CONFIG&&resolve(dataDir)!==resolve(join(homedir(),'.neri-desktop-theme'))&&!existsSync(join(dataDir,'native-plugin-install.json')))return true;
  const path=process.env.NERI_PLUGIN_CONFIG||join(process.env.CODEX_HOME||join(homedir(),'.codex'),'config.toml');
  try{
    const text=readFileSync(path,'utf8');
    const section=text.match(/^\[plugins\."neri-desktop-theme@neri-local"\][ \t]*\r?\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m);
    if(!section)return !existsSync(join(dataDir,'native-plugin-install.json'));
    return section[1].match(/^enabled[ \t]*=[ \t]*(true|false)\b/m)?.[1]!=='false';
  }catch{return null;}
}
