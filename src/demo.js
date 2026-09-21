import {fresh,motion,id} from './model.js';
import {TRIAL_MAP} from './catalog.js';
export function demoProject(){
 const p={...fresh(),name:'灵思 · 让表达更有画面',width:1920,height:1080,duration:10,demoVersion:2};
 p.captions=[['让表达，更有画面',.12,2.2],['字幕、卡片，让重点被看见',2.2,4.9],['让表达与对比，动起来',4.9,7.8],['点击修改，创作你的下一条',7.8,10]].map(([text,start,end])=>({id:id(),text,start,end}));
 const card=(type,start,end,text,left,top,width)=>{const m=motion(type,start,10),s=TRIAL_MAP[type];return{...m,end,text,width:width*100,x:(left+width/2)*100,y:(top+width*1920*s.nh/s.nw/1080/2)*100,color:'#9cebdc'};};
 p.motions=[card('linsi-thesis-lock',.05,2.3,'让表达\n更有画面',.045,.26,.30),card('linsi-identity-tag',.35,4.65,'灵思创作演示\n虚拟剪影 · 无声案例',.69,.51,.255),card('linsi-checklist',2.22,4.9,'字幕跟读\n卡片包装\n自由修改',.045,.26,.30),card('linsi-definition',4.88,7.85,'动态表达\n让信息更易理解',.045,.26,.30),card('linsi-before-after',5.02,7.85,'平铺文字\n动态表达',.675,.275,.28),card('linsi-brand-chapter',7.8,10,'让表达，更有画面\n灵思剪辑 Lite\n字幕 · 动效 · 自由创作',.06,.14,.88),{...motion('chapter-progress',0,10),end:10,text:'开场\n字幕卡片\n表达对比\n开始创作',chapterTimes:[0,.22,.49,.78]}];
 return p;
}
