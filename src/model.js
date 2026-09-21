import {TRIAL_MOTIONS,TRIAL_MAP,createTrial} from './catalog.js';
import {validAnimation} from './animation.js';
export const LEGACY_MOTIONS=[
 {id:'title',name:'重点标题',description:'短标题轻轻入场，让重点更清晰。',text:'把重点说清楚',sub:'让每一次表达更有力量',tag:'观点强调'},
 {id:'steps',name:'三步清单',description:'按顺序呈现三个步骤。',text:'提出问题\n拆开讲清\n给出方法',sub:'分步呈现',tag:'方法步骤'},
 {id:'compare',name:'双栏对比',description:'两种方案，一眼看懂区别。',text:'方案 A\n方案 B',sub:'换个角度看问题',tag:'前后对比'},
 {id:'capsule',name:'图标胶囊',description:'小图标配短句，轻巧不抢画面。',text:'灵感来了',sub:'',tag:'轻量提示'}
];
export const MOTIONS=TRIAL_MOTIONS;
export const ALL_MOTIONS=[...MOTIONS,...LEGACY_MOTIONS];
export const THEMES=[{id:'clean',name:'清爽字幕'},{id:'box',name:'深色字幕条'},{id:'accent',name:'青蓝重点'}];
export const id=()=>crypto.randomUUID();
export function fresh(){return {schema:1,id:id(),name:'未命名工程',width:1920,height:1080,duration:0,source:{width:1920,height:1080,duration:0},videoClips:[],canvas:{ratio:'source',mode:'contain',zoom:1,x:50,y:50,safe:true},captions:[],motions:[],layers:[],audio:null,subtitle:{theme:'clean',size:42,y:88,color:'#ffffff',outline:5,background:35,safe:true,maxChars:24},updated:Date.now()};}
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||0));
export function validRange(start,end,duration){return Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&end<=duration+.001;}
export function motion(type,time,duration){const m=ALL_MOTIONS.find(m=>m.id===type);if(!m)throw Error('请选择精选动效');const start=Math.max(0,Math.min(time,Math.max(0,duration-.1))),end=Math.min(duration,start+(type==='chapter-progress'?duration:5));if(TRIAL_MAP[type])return createTrial(m,id(),start,end);return {id:id(),type,text:m.text,sub:m.sub,start,end,x:27,y:27,scale:1,color:'#63d8ca',icon:'灯泡'};}
export function parseSrt(text,duration){
 const captions=[];let skipped=0;
 const stamp=s=>{const m=s.trim().match(/^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{1,3})$/);return m&&+m[2]<60&&+m[3]<60?+m[1]*3600 + +m[2]*60 + +m[3]+Number(m[4].padEnd(3,'0'))/1000:NaN;};
 for(const block of text.replace(/^\uFEFF/,'').replace(/\r/g,'').split(/\n\s*\n/)){
  if(!block.trim())continue;
  const lines=block.split('\n'),i=lines.findIndex(l=>l.includes('-->'));
  if(i<0){skipped++;continue;}const parts=lines[i].split('-->'),start=stamp(parts[0]),rawEnd=stamp(parts[1]?.trim().split(/\s/)[0]||''),end=Math.min(rawEnd,duration);
  const content=lines.slice(i+1).join('\n').replace(/<[^>]*>/g,'').trim();
  if(!validRange(start,end,duration)||!content||content.length>500||captions.length>=2000){skipped++;continue;}
  captions.push({id:id(),start,end,text:content});
 }
 return {captions:captions.sort((a,b)=>a.start-b.start),skipped};
}
export function serializeSrt(captions){const ts=s=>{const ms=Math.round(s*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};return [...captions].sort((a,b)=>a.start-b.start).map((c,i)=>`${i+1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}`).join('\n\n');}
export function validateProject(p){
 if(!p||p.schema!==1||typeof p.id!=='string'||!Number.isFinite(p.duration)||p.duration<=0||p.duration>3600||!Array.isArray(p.captions)||!Array.isArray(p.motions)||p.captions.length>2000||p.motions.length>200)throw Error('工程格式不受支持');
 if(!p.source||!Number.isFinite(p.source.duration)||p.source.duration<=0)p.source={width:p.width,height:p.height,duration:p.duration};
 if(!Array.isArray(p.videoClips)||!p.videoClips.length)p.videoClips=[{id:id(),sourceStart:0,sourceEnd:p.source.duration,speed:1,volume:1,muted:false}];
 p.canvas||={ratio:'source',mode:'contain',zoom:1,x:50,y:50,safe:true};p.layers||=[];p.subtitle={outline:5,background:35,safe:true,maxChars:24,...p.subtitle};
 if(typeof p.name!=='string'||p.name.length>80||![p.width,p.height].every(x=>Number.isInteger(x)&&x>=2&&x<=8192)||!p.subtitle||!THEMES.some(s=>s.id===p.subtitle.theme)||!Number.isFinite(p.subtitle.size)||p.subtitle.size<20||p.subtitle.size>80||!Number.isFinite(p.subtitle.y)||p.subtitle.y<15||p.subtitle.y>94||!/^#[0-9a-f]{6}$/i.test(p.subtitle.color))throw Error('工程画面或字幕设置无效');
 const ids=new Set();let imageCount=0;
 for(const c of [...p.captions,...p.motions])if(!validRange(c.start,c.end,p.duration)||typeof c.text!=='string'||c.text.length>500)throw Error('工程中有无效字幕或时间范围');
 for(const c of [...p.captions,...p.motions]){if(typeof c.id!=='string'||c.id.length>100||ids.has(c.id))throw Error('工程片段标识无效');ids.add(c.id);}
 for(const m of p.motions){if(!ALL_MOTIONS.some(t=>t.id===m.type))throw Error('此工程包含不支持的动效');
  if(![m.x,m.y,m.scale].every(Number.isFinite)||m.x<0||m.x>100||m.y<0||m.y>100||!/^#[0-9a-f]{6}$/i.test(m.color))throw Error('动效位置或颜色无效');
  const spec=TRIAL_MAP[m.type];if(!spec)continue;
  if(m.animation!==undefined&&!validAnimation(m.animation))throw Error('动效节奏或过渡设置无效');
  if(!Number.isFinite(m.width)||m.width<10||m.width>100||!Array.isArray(m.images)||m.images.length>(spec.images||0)||m.textColor&&!/^#[0-9a-f]{6}$/i.test(m.textColor))throw Error('动效图片或尺寸无效');
  for(const data of m.images){if(!data)continue;imageCount++;if(typeof data!=='string'||data.length>4*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(data))throw Error('工程仅支持内嵌的本地图片');}
  if(spec.metrics){if(!Array.isArray(m.values)||m.values.length!==2||!Array.isArray(m.directions)||m.directions.length!==2||m.values.some((v,i)=>!Number.isFinite(v)||v<0||v>10000||!['下降','减少','提升','增加'].includes(m.directions[i])||(['下降','减少'].includes(m.directions[i])&&v>100)))throw Error('指标数值无效');if(spec.metrics==='dual'&&(m.directions[0]!=='下降'||m.directions[1]!=='提升'))throw Error('双指标变化需要先下降、后提升');}
  if(spec.series&&(!Array.isArray(m.series)||m.series.length!==8||m.series.some(v=>!Number.isFinite(v)||Math.abs(v)>1e9)))throw Error('趋势需要 8 个有效数值');
  if(m.type==='chapter-progress'&&(!Array.isArray(m.chapterTimes)||m.chapterTimes.length!==m.text.split('\n').length||m.chapterTimes.length>12||m.chapterTimes[0]!==0||m.chapterTimes.some((v,i)=>!Number.isFinite(v)||v<0||v>=1||(i&&v<=m.chapterTimes[i-1]))))throw Error('章节时间无效');
 }
 if(imageCount>60)throw Error('单个工程最多使用 60 张图片');
 if(!p.source||![p.source.width,p.source.height].every(x=>Number.isFinite(x)&&x>=2&&x<=8192)||!Number.isFinite(p.source.duration)||p.source.duration<=0||!Array.isArray(p.videoClips)||!p.videoClips.length||p.videoClips.length>500)throw Error('视频时间线无效');
 for(const c of p.videoClips)if(typeof c.id!=='string'||!Number.isFinite(c.sourceStart)||!Number.isFinite(c.sourceEnd)||c.sourceStart<0||c.sourceEnd>p.source.duration+.01||c.sourceEnd<=c.sourceStart||!Number.isFinite(c.speed)||c.speed<.25||c.speed>4||!Number.isFinite(c.volume)||c.volume<0||c.volume>2)throw Error('视频片段参数无效');
 if(!p.canvas||!['source','9:16','16:9','1:1'].includes(p.canvas.ratio)||!['contain','cover'].includes(p.canvas.mode)||![p.canvas.zoom,p.canvas.x,p.canvas.y].every(Number.isFinite))throw Error('画布设置无效');
 if(!Array.isArray(p.layers)||p.layers.length>100)throw Error('图文图层无效');
 for(const l of p.layers){if(!['text','image'].includes(l.kind)||!validRange(l.start,l.end,p.duration)||![l.x,l.y,l.width,l.rotation,l.opacity].every(Number.isFinite)||l.x<0||l.x>100||l.y<0||l.y>100||l.width<5||l.width>100||l.opacity<0||l.opacity>100)throw Error('图文图层参数无效');if(l.kind==='image'&&(typeof l.data!=='string'||l.data.length>4*1024*1024))throw Error('图层图片无效');}
 return p;
}
