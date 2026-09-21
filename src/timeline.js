const uid=()=>crypto.randomUUID();
const n=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

export function clipDuration(clip){return Math.max(.01,(clip.sourceEnd-clip.sourceStart)/clip.speed);}

export function layoutClips(project){
 let cursor=0;
 return (project.videoClips||[]).map((clip,index)=>{
  const duration=clipDuration(clip),row={...clip,index,timelineStart:cursor,timelineEnd:cursor+duration,duration};cursor+=duration;return row;
 });
}

export function recomputeDuration(project){
 const duration=layoutClips(project).at(-1)?.timelineEnd||.01;
 project.duration=duration;
 for(const key of ['captions','motions','layers'])project[key]=(project[key]||[]).filter(x=>x.start<duration).map(x=>({...x,end:Math.min(x.end,duration)})).filter(x=>x.end>x.start+.01);
 if(project.audio){project.audio.start=Math.min(project.audio.start,duration-.01);project.audio.end=Math.min(project.audio.end,duration);if(project.audio.end<=project.audio.start)project.audio=null;}
 return duration;
}

export function normalizeProject(project,source={}){
 const p=project;
 p.schema=1;
 p.source={width:n(p.source?.width,source.width||p.width||1920),height:n(p.source?.height,source.height||p.height||1080),duration:n(p.source?.duration,0)>0?n(p.source.duration,.01):(source.duration||p.duration||.01)};
 p.canvas={ratio:p.canvas?.ratio||'source',mode:p.canvas?.mode==='cover'?'cover':'contain',zoom:Math.min(3,Math.max(.2,n(p.canvas?.zoom,1))),x:Math.min(100,Math.max(0,n(p.canvas?.x,50))),y:Math.min(100,Math.max(0,n(p.canvas?.y,50))),safe:p.canvas?.safe!==false};
 if(!Array.isArray(p.videoClips)||!p.videoClips.length)p.videoClips=[{id:uid(),sourceStart:0,sourceEnd:p.source.duration,speed:1,volume:1,muted:false}];
 p.videoClips=p.videoClips.map(c=>({id:String(c.id||uid()),sourceStart:Math.max(0,n(c.sourceStart,0)),sourceEnd:Math.min(p.source.duration,n(c.sourceEnd,p.source.duration)),speed:Math.min(4,Math.max(.25,n(c.speed,1))),volume:Math.min(2,Math.max(0,n(c.volume,1))),muted:!!c.muted})).filter(c=>c.sourceEnd>c.sourceStart+.01);
 p.layers=Array.isArray(p.layers)?p.layers:[];
 p.subtitle={theme:'clean',size:42,y:88,color:'#ffffff',outline:5,background:35,safe:true,maxChars:24,...p.subtitle};
 p.audio=p.audio?{name:String(p.audio.name||'背景音乐'),type:String(p.audio.type||'audio/mpeg'),start:Math.max(0,n(p.audio.start,0)),end:Math.max(.01,n(p.audio.end,p.duration)),trimStart:Math.max(0,n(p.audio.trimStart,0)),volume:Math.min(2,Math.max(0,n(p.audio.volume,.35))),fadeIn:Math.min(10,Math.max(0,n(p.audio.fadeIn,1))),fadeOut:Math.min(10,Math.max(0,n(p.audio.fadeOut,1))),loop:p.audio.loop!==false}:null;
 recomputeDuration(p);return p;
}

export function mapTimelineTime(project,time){
 const rows=layoutClips(project),t=Math.min(Math.max(0,time),Math.max(0,project.duration-.0001));
 const row=rows.find(x=>t>=x.timelineStart&&t<x.timelineEnd)||rows.at(-1);
 if(!row)return null;
 return {...row,sourceTime:Math.min(row.sourceEnd-.0001,row.sourceStart+(t-row.timelineStart)*row.speed)};
}

export function splitClip(project,time){
 const hit=mapTimelineTime(project,time);if(!hit||time<=hit.timelineStart+.05||time>=hit.timelineEnd-.05)return null;
 const at=hit.sourceTime,left={...project.videoClips[hit.index],sourceEnd:at},right={...project.videoClips[hit.index],id:uid(),sourceStart:at};
 project.videoClips.splice(hit.index,1,left,right);recomputeDuration(project);return right.id;
}
export function deleteClip(project,id){if(project.videoClips.length<=1)return false;const i=project.videoClips.findIndex(c=>c.id===id);if(i<0)return false;project.videoClips.splice(i,1);recomputeDuration(project);return true;}
export function duplicateClip(project,id){const i=project.videoClips.findIndex(c=>c.id===id);if(i<0)return null;const copy={...project.videoClips[i],id:uid()};project.videoClips.splice(i+1,0,copy);recomputeDuration(project);return copy.id;}
export function moveClip(project,id,direction){const i=project.videoClips.findIndex(c=>c.id===id),j=i+direction;if(i<0||j<0||j>=project.videoClips.length)return false;[project.videoClips[i],project.videoClips[j]]=[project.videoClips[j],project.videoClips[i]];recomputeDuration(project);return true;}
export function trimClip(project,id,side,delta){const clip=project.videoClips.find(c=>c.id===id);if(!clip)return false;if(side==='start')clip.sourceStart=Math.min(clip.sourceEnd-.05,Math.max(0,clip.sourceStart+delta));else clip.sourceEnd=Math.max(clip.sourceStart+.05,Math.min(project.source.duration,clip.sourceEnd+delta));recomputeDuration(project);return true;}

export function canvasDimensions(source,ratio){
 if(ratio==='9:16')return {width:1080,height:1920};if(ratio==='16:9')return {width:1920,height:1080};if(ratio==='1:1')return {width:1080,height:1080};
 return {width:source.width,height:source.height};
}
