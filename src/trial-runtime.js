import {TRIAL_MAP,motionBounds} from './catalog.js';
import {primary,setOptions} from './trial/primary.js';
import {drawShowcaseMotion} from './trial/showcaseMotionScenes.js';
import {numberUnit,checkTitle,declaration} from './trial/lightTypographyScenes.js';
import {timeline,metrics,panel,lockBadge} from './trial/processMotionScenes.js';
import {drawDual} from './trial/metricScene.js';
import {imageFor} from './media.js';
import {animationFrame} from './animation.js';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>1-(1-clamp(n))**3;
const layers=new WeakMap();
export function drawTrial(ctx,m,t,w,h,thumbnail=false){
 if(!m.animation||m.type==='chapter-progress')return drawContent(ctx,m,t,w,h,thumbnail);
 if(t<m.start||t>=m.end)return;
 let layer=layers.get(ctx);if(!layer){layer=document.createElement('canvas');layers.set(ctx,layer);}
 if(layer.width!==w||layer.height!==h){layer.width=w;layer.height=h;}
 const surface=layer.getContext('2d');surface.clearRect(0,0,w,h);
 drawContent(surface,m,t,w,h,thumbnail);
 const f=animationFrame(m,t),b=thumbnail?{x:0,y:0,width:w,height:h}:motionBounds(m,w,h),cx=b.x+b.width/2,cy=b.y+b.height/2;
 ctx.save();try{ctx.globalAlpha*=f.alpha;ctx.translate(cx,cy+f.offset*b.height);ctx.scale(f.scale,f.scale);ctx.drawImage(layer,-cx,-cy);}finally{ctx.restore();}
}
function drawContent(ctx,m,t,w,h,thumbnail){
 const spec=TRIAL_MAP[m.type];if(!spec||t<m.start||t>=m.end)return;
 let b=motionBounds(m,w,h);if(thumbnail){const ratio=Math.min(w*.88/spec.nw,h*.86/spec.nh);b={x:(w-spec.nw*ratio)/2,y:(h-spec.nh*ratio)/2,width:spec.nw*ratio,height:spec.nh*ratio};}
 const phase=m.animation&&m.type!=='chapter-progress'?animationFrame(m,t).phase:{local:t-m.start,duration:m.end-m.start,exit:clamp((m.end-t)/.24)}, {local,duration}=phase;
 const parts=m.text.split('\n'),s={...m,duration,accent:m.color,liteBox:{x:0,y:0,width:spec.nw,height:spec.nh,side:'center'},customization:{style:{textColor:m.textColor||'#f7fbff'}},lightType:{count:m.count===true},mediaSlots:(m.images||[]).map(()=>({fit:'cover'}))};
 s.liteMetricLabels=parts;
 if(spec.metrics)s.text=parts.map((label,i)=>`${label}${m.directions?.[i]||(i?'提升':'下降')}${m.values?.[i]??0}%`).join('\n');
 const options={mediaFrames:(m.images||[]).map(imageFor)};
 ctx.save();try{
  ctx.translate(b.x,b.y);ctx.scale(b.width/spec.nw,b.height/spec.nh);ctx.beginPath();ctx.rect(0,0,spec.nw,spec.nh);ctx.clip();
  if(m.type==='chapter-progress'){drawChapters(ctx,m,local/duration,spec.nw,spec.nh);return;}
  if(spec.showcase&&m.presentationProfile==='linsi-showcase-v2'){drawShowcaseMotion(ctx,{width:1920,height:1080},s,phase);return;}
  ctx.globalAlpha*=ease(local/.12)*(m.animation?1:clamp((duration-local)/.24));
  if(m.type.startsWith('linsi-type-')){const tm=local*Math.max(1,3.5/duration);if(m.type==='linsi-type-number-unit')numberUnit(ctx,s,tm,m.color,m.textColor||'#fff');else if(m.type==='linsi-type-check-title')checkTitle(ctx,s,tm,m.color,m.textColor||'#fff','#1a2c3a');else declaration(ctx,s,tm,m.color,m.textColor||'#fff',options);}
  else if(m.type==='linsi-timeline-assemble'||m.type==='linsi-metric-volume'){const progress=local/duration;panel(ctx,m.color);(m.type==='linsi-timeline-assemble'?timeline:metrics)(ctx,s,progress,m.color,{nodeInterval:1});lockBadge(ctx,'',m.color,progress);}
  else if(m.type==='linsi-dual-metric')drawDual(ctx,{width:1920,height:1080},s,phase);
  else {setOptions(options);primary[m.type](ctx,{width:1920,height:1080},s,phase);}
 }finally{setOptions(null);ctx.restore();}
}
// Classic trial chapter navigation only: no premium variants or navigation runtime.
function drawChapters(ctx,m,progress,w,h){
 const names=m.text.split('\n'),times=m.chapterTimes||names.map((_,i)=>i/names.length);ctx.fillStyle='rgba(10,15,23,.76)';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 23px "Microsoft YaHei",sans-serif';
 names.forEach((name,i)=>{const start=times[i]??i/names.length,end=times[i+1]??1,p=clamp((progress-start)/(end-start)),cell=w/names.length,x=i*cell;ctx.fillStyle=m.color;ctx.globalAlpha=progress>=start&&progress<end?.22:.11;ctx.fillRect(x,0,cell*p,h);ctx.globalAlpha=1;ctx.fillStyle='#ffffff24';ctx.fillRect(x+1,h-3,cell-2,3);ctx.fillStyle=m.color;ctx.fillRect(x+1,h-3,(cell-2)*p,3);ctx.fillStyle=p>0?(m.textColor||'#fff'):'#a4acb9';ctx.fillText(name,x+cell/2,h*.47,cell-26);if(i){ctx.fillStyle='#ffffff2e';ctx.fillRect(x,h*.3,1,h*.3);}});
}
