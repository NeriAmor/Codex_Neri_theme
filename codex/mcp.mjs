import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { ensureService, serviceRequest } from './service-client.mjs';
const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;

const tools=[
  {name:'neri_status',description:'Read Neri Desktop Theme connection, enabled state, current wallpaper and glass settings.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
  {name:'neri_open_settings',description:'Open the draggable Neri Desktop Theme settings panel inside the running Codex main window.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'neri_list_wallpapers',description:'List discovered local and Steam wallpapers, optionally filtered by title.',inputSchema:{type:'object',properties:{query:{type:'string'}},additionalProperties:false},annotations:{readOnlyHint:true}},
  {name:'neri_set_enabled',description:'Enable the selected wallpaper and glass styling, or disable them and restore the original interface.',inputSchema:{type:'object',properties:{enabled:{type:'boolean'}},required:['enabled'],additionalProperties:false}},
  {name:'neri_apply_wallpaper',description:'Apply a discovered wallpaper by its ID from neri_list_wallpapers.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}},
  {name:'neri_set_glass',description:'Set glass opacity and optional sidebar blur in the Codex wallpaper skin.',inputSchema:{type:'object',properties:{opacity:{type:'number',minimum:.2,maximum:.98},blur:{type:'number',minimum:0,maximum:40}},required:['opacity'],additionalProperties:false}},
];
function statusView(state){return{enabled:state.skinEnabled,servicePid:state.pid,wallpaper:state.activeItem?{id:state.activeItem.id,title:state.activeItem.title,kind:state.activeItem.kind}:null,host:state.host,glassOpacity:state.config.glassOpacity,glassBlur:state.config.glassBlur};}
async function call(name,args){
  if(name==='neri_status')return statusView(await serviceRequest('state'));
  if(name==='neri_open_settings'){await serviceRequest('panel',{});const state=await serviceRequest('state');return{...statusView(state),message:state.host.connected?'已打开悬浮设置':'等待带壁纸连接参数的 Codex 主窗口；请从安装器创建的 Codex 图标启动。'};}
  if(name==='neri_list_wallpapers'){const lib=await serviceRequest('library');const query=String(args.query||'').toLowerCase();return{items:lib.items.filter(i=>i.title.toLowerCase().includes(query)).map(i=>({id:i.id,title:i.title,kind:i.kind,source:i.source}))};}
  if(name==='neri_set_enabled'){if(typeof args.enabled!=='boolean')throw Error('enabled must be a boolean');await serviceRequest('config',{skinEnabled:args.enabled});return statusView(await serviceRequest('state'));}
  if(name==='neri_apply_wallpaper'){if(typeof args.id!=='string'||!args.id)throw Error('id is required');await serviceRequest('apply',{id:args.id});return statusView(await serviceRequest('state'));}
  if(name==='neri_set_glass'){if(!Number.isFinite(args.opacity)||args.opacity<.2||args.opacity>.98)throw Error('opacity must be between 0.2 and 0.98');if(args.blur!==undefined&&(!Number.isFinite(args.blur)||args.blur<0||args.blur>40))throw Error('blur must be between 0 and 40');await serviceRequest('config',{glassOpacity:args.opacity,...(args.blur===undefined?{}:{glassBlur:args.blur})});return statusView(await serviceRequest('state'));}
  throw Error('Unknown wallpaper tool');
}
const reply=(id,result)=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n');
const error=(id,code,message)=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}})+'\n');
let initialized=false;
const recovery=setInterval(()=>{if(initialized)void ensureService().catch(()=>{});},2000);recovery.unref();
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',line=>void(async()=>{
  let request;
  try{
    request=JSON.parse(line);
    if(request.id===undefined)return;
    if(request.method==='initialize'){
      await ensureService();initialized=true;
      reply(request.id,{protocolVersion:request.params?.protocolVersion||'2024-11-05',capabilities:{tools:{listChanged:false}},serverInfo:{name:'neri-desktop-theme',version}});
    }else if(request.method==='ping')reply(request.id,{});
    else if(request.method==='tools/list')reply(request.id,{tools});
    else if(request.method==='tools/call'){
      try{const result=await call(request.params?.name,request.params?.arguments||{});reply(request.id,{content:[{type:'text',text:JSON.stringify(result)}]});}
      catch(e){reply(request.id,{isError:true,content:[{type:'text',text:e.message}]});}
    }else error(request.id,-32601,'Method not found');
  }catch(e){error(request?.id??null,request?-32603:-32700,e.message);}
})());
input.on('close',()=>{clearInterval(recovery);process.exit(0)});
