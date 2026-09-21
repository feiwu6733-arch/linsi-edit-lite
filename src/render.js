import {drawTrial} from './trial-runtime.js';
import {TRIAL_MAP} from './catalog.js';
import {LIGHT_OVERLAY_ICONS} from './vendor/lightOverlayIcons.js';
import {clamp} from './model.js';
import {drawLayers} from './composition.js';
const ease=x=>1-Math.pow(1-clamp(x,0,1),3);
function round(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function lines(ctx,text,maxWidth){const out=[];for(const row of String(text).split('\n')){let line='';for(const c of row){if(ctx.measureText(line+c).width>maxWidth&&line){out.push(line);line='';}line+=c;}out.push(line);}return out;}
function label(ctx,text,x,y,size,maxWidth,color='#ffffff',align='left',weight=600){ctx.font=`${weight} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;const rows=lines(ctx,text,maxWidth).slice(0,4);rows.forEach((s,i)=>ctx.fillText(s,x,y+i*size*1.35));return rows.length;}
export function drawMotion(ctx,m,t,width,height,thumbnail=false){
 if(TRIAL_MAP[m.type])return drawTrial(ctx,m,t,width,height,thumbnail);
 if(t<m.start||t>=m.end)return;
 const a=t-m.start,remain=m.end-t,enter=ease(a/.48),fade=Math.min(1,remain/.25),unit=thumbnail?Math.min(width/560,height/320):Math.min(width,height)/1080*clamp(m.scale,.4,1.7);
 ctx.save();ctx.globalAlpha=enter*fade;ctx.translate(width*clamp(m.x,5,95)/100,height*clamp(m.y,5,95)/100+(1-enter)*20*unit);ctx.scale(unit,unit);
 const color=/^#[\da-f]{6}$/i.test(m.color)?m.color:'#63d8ca';
 const panel=(x,y,w,h)=>{ctx.fillStyle='rgba(15,27,37,.94)';ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1.5;round(ctx,x,y,w,h,20);ctx.fill();ctx.stroke();};
 if(m.type==='title'){panel(-245,-65,490,155);ctx.fillStyle=color;round(ctx,-225,-35,5,78,2);ctx.fill();label(ctx,m.text,-198,-4,34,405);label(ctx,m.sub,-198,52,20,405,'#b5c5ce');}
 if(m.type==='steps'){panel(-235,-118,470,258);label(ctx,m.sub||'分步呈现',-205,-82,22,410,color);String(m.text).split('\n').slice(0,3).forEach((text,i)=>{const p=ease((a-.12*i)/.4);ctx.save();ctx.globalAlpha*=p;ctx.translate((1-p)*18,0);ctx.fillStyle='#223543';round(ctx,-208,-51+i*56,416,48,9);ctx.fill();label(ctx,`0${i+1}`,-194,-27+i*56,20,45,color);label(ctx,text,-142,-27+i*56,24,330);ctx.restore();});}
 if(m.type==='compare'){const texts=String(m.text).split('\n');[-1,1].forEach((side,i)=>{ctx.save();ctx.translate(side*(1-enter)*30,0);panel(side<0?-245:12,-65,233,160);label(ctx,i?'B':'A',side<0?-214:44,-27,22,100,color);label(ctx,texts[i]||'',side<0?-214:44,18,28,174);ctx.restore();});label(ctx,m.sub||'',0,129,21,480,'#d1dce2','center');}
 if(m.type==='capsule'){panel(-175,-42,350,84);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';const strokes=LIGHT_OVERLAY_ICONS[m.icon]||LIGHT_OVERLAY_ICONS['灯泡'];for(const points of strokes){ctx.beginPath();points.forEach(([x,y],i)=>{const px=-154+x*.5,py=-25+y*.5;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();}label(ctx,m.text,-85,0,28,245);}
 ctx.restore();
}
export function drawOverlays(ctx,p,time,w,h,original=false){
 if(original)return;
 for(const m of p.motions)drawMotion(ctx,m,time,w,h);
 drawLayers(ctx,p,time,w,h);
 const active=p.captions.filter(c=>time>=c.start&&time<c.end);if(!active.length)return;
 const s=p.subtitle,size=clamp(s.size,20,80)*Math.min(w,h)/1080,max=w*.86;
 ctx.save();ctx.font=`600 ${size}px "Microsoft YaHei",sans-serif`;const rows=active.flatMap(c=>lines(ctx,c.text,max)).slice(0,4);const lineHeight=size*1.4,y=h*clamp(s.y,15,94)/100-(rows.length-1)*lineHeight/2;
 rows.forEach((text,i)=>{const yy=y+i*lineHeight,tw=ctx.measureText(text).width;ctx.fillStyle=s.theme==='box'?'rgba(0,0,0,.85)':`rgba(0,0,0,${clamp(s.background??35,0,100)/100})`;round(ctx,(w-tw)/2-size*.3,yy-size*.7,tw+size*.6,size*1.4,8);ctx.fill();ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=Math.max(0,size*clamp(s.outline??5,0,15)/100);ctx.strokeStyle='rgba(0,0,0,.9)';if(ctx.lineWidth)ctx.strokeText(text,w/2,yy);ctx.fillStyle=s.theme==='accent'?'#75eddb':s.color||'#ffffff';ctx.fillText(text,w/2,yy);});ctx.restore();
}
