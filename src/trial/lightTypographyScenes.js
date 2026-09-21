// Public trial drawing subset; adapted for independent Lite geometry.
import {lightTypeLines} from './lightTypographyModel.js';
import {lightTypeSettings} from './lightTypographyModel.js';
import {canvasFont} from './canvasTypography.js';
export const clamp = x => Math.max(0,Math.min(1,x));
export const ease = x => 1 - Math.pow(1-clamp(x),4);
export const progress = (t,start,duration=.48) => ease((t-start)/duration);
export const font = (c,size,weight=700) => { c.font=canvasFont(weight,size,'"Microsoft YaHei", sans-serif'); };
export function text(c,value,x,y,size,width,color,weight=700) {
  if(!value)return;
  font(c,size,weight); const ratio=Math.min(1,width/Math.max(1,c.measureText(value).width));
  c.save(); c.translate(x,y); c.scale(ratio,ratio); c.fillStyle=color; c.textAlign='left'; c.textBaseline='alphabetic'; c.fillText(value,0,0); c.restore();
}
export function line(c,x,y,xx,yy,color,width=2) { c.strokeStyle=color; c.lineWidth=width; c.beginPath(); c.moveTo(x,y);c.lineTo(xx,yy);c.stroke(); }
export function box(c,x,y,w,h,color,r=6) { c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill(); }
export function arrive(c,t,start,draw,dy=26,d=.48) {
  if(t<start)return;
  const p=progress(t,start,d); c.save(); c.translate(0,(1-p)*dy); draw(p); c.restore();
}
export function eyebrow(c,value,t,a,enabled) { if(!enabled||!value)return; arrive(c,t,.02,()=>{line(c,22,24,22,40,a,3);text(c,value,36,37,17,610,a,500);},10,.32); }
export function phrase(c,value,x,y,size,width,color,t,start) {
  if(!value)return; font(c,size);
  const chars=Array.from(value), full=c.measureText(value).width, scale=Math.min(1,width/Math.max(1,full));
  c.save();c.translate(x,y);c.scale(scale,scale);
  const groups=[];for(let i=0;i<chars.length;i+=2)groups.push(chars.slice(i,i+2).join(''));
  let cursor=0;const stagger=Math.min(.075,.38/Math.max(1,groups.length-1));
  for(let i=0;i<groups.length;i++){const word=groups[i], x0=cursor; font(c,size);cursor+=c.measureText(word).width;
    // Crop the upward arrival at its final text line, with no persistent echo layer.
    c.save();c.beginPath();c.rect(x0-2,-size*1.2,cursor-x0+4,size*1.5);c.clip();
    arrive(c,t,start+i*stagger,()=>text(c,word,x0,0,size,10000,color),size*.7,.42);c.restore();
  }c.restore();
}
export function check(c,x,y,size,p,color) {
  const points=[[x,y+size*.5],[x+size*.35,y+size*.85],[x+size,y]], lens=[size*Math.hypot(.35,.35),size*Math.hypot(.65,.85)];let remain=clamp(p)*(lens[0]+lens[1]);
  c.beginPath();c.moveTo(...points[0]);for(let i=0;i<2;i++){const f=Math.min(1,remain/lens[i]);c.lineTo(points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f);remain-=lens[i];if(remain<=0)break;}c.strokeStyle=color;c.lineWidth=4;c.lineCap='round';c.lineJoin='round';c.stroke();
}
export function numberUnit(c,s,t,a,fg) {
  const [number,unit,note,kicker]=lightTypeLines(s), settings=lightTypeSettings(s);eyebrow(c,kicker,t,a,settings.showEyebrow);
  const valid=/^-?\d+(\.\d+)?$/.test(number), counting=settings.count&&valid, end=counting?1.55:.48;
  font(c,154);const numberWidth=Math.min(395,c.measureText(number).width), unitX=26+numberWidth+20;
  arrive(c,t,.1,p=>{const countP=progress(t,.1,1.45), places=(number.split('.')[1]||'').length;
    const shown=counting?(Number(number)*countP).toFixed(places):number;
    c.save();c.translate(26,211);const scale=counting?.85+.15*countP:.96+.04*p;c.scale(scale,scale);text(c,shown,0,0,154,395,fg);c.restore();},45);
  arrive(c,t,end+.08,()=>text(c,unit,unitX,204,63,660-unitX,a,500),20,.35);
  arrive(c,t,end+.28,()=>{line(c,26,252,72,252,a,2);text(c,note,26,299,27,650,fg,500);},14);
}
export function checkTitle(c,s,t,a,fg,bg) {
  const [title,...rest]=lightTypeLines(s);eyebrow(c,rest[3],t,a,lightTypeSettings(s).showEyebrow);
  arrive(c,t,.08,()=>box(c,24,101,55,55,a,12),15,.3);
  if(t>.28)check(c,38,114,27,progress(t,.28,.35),'#14202a');
  phrase(c,title,99,147,49,591,fg,t,.34);
  rest.slice(0,3).forEach((label,i)=>arrive(c,t,.86+i*.12,()=>{if(!label)return;box(c,24+i*224,205,210,58,bg,6);line(c,38+i*224,222,38+i*224,245,a,2);text(c,label,51+i*224,243,24,169,fg,500);},19,.4));
}
export function declaration(c,s,t,a,fg,options) {
  const [main,accent,kicker,note]=lightTypeLines(s), cfg=lightTypeSettings(s);eyebrow(c,kicker,t,a,cfg.showEyebrow);
  if(t>.06)line(c,25,81,25,81+166*progress(t,.06,.52),a,2);
  phrase(c,main,47,135,53,637,fg,t,.25);
  const second=.25+cfg.delay;phrase(c,accent,47,218,63,637,a,t,second);
  const m=options.mediaFrames?.[0],image=m?.frame||m?.image||m?.canvas||m;
  arrive(c,t,second+.55,()=>{
    if(image?.width>0&&image?.height>0){const scale=Math.min(80/image.width,80/image.height);c.drawImage(image,47,277,image.width*scale,image.height*scale);text(c,note,149,321,26,530,fg,500);}
    else text(c,note,48,303,28,630,fg,500);
  },14);
}