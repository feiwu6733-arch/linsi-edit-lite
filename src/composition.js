import {clamp} from './model.js';
import {imageFor} from './media.js';

export function drawVideoFrame(ctx,source,canvas,w,h){
 const sw=source.videoWidth||source.width,sh=source.videoHeight||source.height;if(!sw||!sh)return;
 const base=canvas.mode==='cover'?Math.max(w/sw,h/sh):Math.min(w/sw,h/sh),scale=base*clamp(canvas.zoom,.2,3),dw=sw*scale,dh=sh*scale;
 const x=(w-dw)*clamp(canvas.x,0,100)/100,y=(h-dh)*clamp(canvas.y,0,100)/100;ctx.drawImage(source,x,y,dw,dh);
}
export function drawSafeZone(ctx,w,h){ctx.save();ctx.strokeStyle='rgba(117,237,219,.48)';ctx.lineWidth=Math.max(1,Math.min(w,h)/500);ctx.setLineDash([10,8]);ctx.strokeRect(w*.08,h*.08,w*.84,h*.78);ctx.setLineDash([]);ctx.strokeStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.moveTo(w/2,h*.08);ctx.lineTo(w/2,h*.86);ctx.moveTo(w*.08,h/2);ctx.lineTo(w*.92,h/2);ctx.stroke();ctx.restore();}
export function layerBounds(layer,w,h){const width=w*clamp(layer.width,5,100)/100,height=layer.kind==='image'?width/(layer.aspect||1):Math.max(54,h*(layer.fontSize||6)/100*1.55);return{x:w*layer.x/100-width/2,y:h*layer.y/100-height/2,width,height};}
export function drawLayers(ctx,project,time,w,h){
 for(const layer of project.layers||[]){if(layer.hidden||time<layer.start||time>=layer.end)continue;const b=layerBounds(layer,w,h);ctx.save();ctx.globalAlpha=clamp(layer.opacity,0,100)/100;ctx.translate(b.x+b.width/2,b.y+b.height/2);ctx.rotate((layer.rotation||0)*Math.PI/180);ctx.translate(-b.width/2,-b.height/2);
  if(layer.kind==='image'){const image=imageFor(layer.data);if(image){ctx.beginPath();ctx.roundRect(0,0,b.width,b.height,Math.min(b.width,b.height)*clamp(layer.radius||0,0,50)/100);ctx.clip();ctx.drawImage(image,0,0,b.width,b.height);}}
  else {const size=Math.max(16,(layer.fontSize||6)*h/100);ctx.font=`${layer.weight||700} ${size}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';const pad=size*.45,text=String(layer.text||'文字');const tw=Math.min(b.width,ctx.measureText(text).width+pad*2);if(layer.background){ctx.fillStyle=layer.background;ctx.beginPath();ctx.roundRect((b.width-tw)/2,0,tw,b.height,Math.min(20,b.height*.22));ctx.fill();}ctx.fillStyle=layer.color||'#fff';ctx.fillText(text,b.width/2,b.height/2,b.width-pad);}
  ctx.restore();
 }
}
