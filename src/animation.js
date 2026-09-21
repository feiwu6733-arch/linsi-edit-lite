export const ANIMATION_DEFAULTS={tempo:1,entrance:'native',exit:'fade',transition:.3,opacity:100};
export const ENTRANCES={native:'原生编排',fade:'轻柔淡入',rise:'上浮入场',pop:'缩放入场'};
export const EXITS={fade:'淡出',rise:'上移淡出',shrink:'缩小淡出',none:'直接结束'};
const clamp=n=>Math.max(0,Math.min(1,n));
export function animationFrame(m,time){
 const a={...ANIMATION_DEFAULTS,...m.animation},duration=m.end-m.start,elapsed=time-m.start;
 const transition=Math.min(a.transition,duration*.2),exitTime=a.exit==='none'?0:transition;
 const body=clamp(elapsed/Math.max(.001,Math.min(duration*.78,duration-exitTime)));
 const progress=body**(1/a.tempo),entry=1-(1-clamp(elapsed/Math.max(.001,transition)))**3;
 const leave=exitTime?clamp((duration-elapsed)/exitTime):1;
 return {progress,entry,leave,alpha:a.opacity/100*(a.entrance==='native'?1:entry)*leave,
  scale:(a.entrance==='pop'?.82+.18*entry:1)*(a.exit==='shrink'?.88+.12*leave:1),
  offset:(a.entrance==='rise'?(1-entry)*.10:0)-(a.exit==='rise'?(1-leave)*.08:0),
  phase:{local:progress*Math.max(4,duration),duration:Math.max(4,duration),exit:1}};
}
export function validAnimation(a){return a&&typeof a==='object'&&[.75,1,1.5,2].includes(a.tempo)&&Object.hasOwn(ENTRANCES,a.entrance)&&Object.hasOwn(EXITS,a.exit)&&Number.isFinite(a.transition)&&a.transition>=.15&&a.transition<=1&&Number.isFinite(a.opacity)&&a.opacity>=20&&a.opacity<=100;}
export function addChapter(m){
 const parts=m.text.split('\n');if(parts.length>=12)throw Error('最多添加 12 个章节');
 const times=m.chapterTimes||parts.map((_,i)=>i/parts.length);
 parts.push(`章节 ${parts.length+1}`);return {...m,text:parts.join('\n'),chapterTimes:[...times,(times.at(-1)+1)/2]};
}
export function removeChapter(m,index){
 const parts=m.text.split('\n');if(parts.length<=2)throw Error('请至少保留 2 个章节');
 parts.splice(index,1);const times=[...m.chapterTimes];times.splice(index,1);times[0]=0;return {...m,text:parts.join('\n'),chapterTimes:times};
}
