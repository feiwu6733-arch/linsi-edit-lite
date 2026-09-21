import {id,clamp} from './model.js';
export function replaceCaptionText(captions,find,replacement){if(!find)return 0;let count=0;for(const c of captions){const next=c.text.split(find).join(replacement);if(next!==c.text){c.text=next;count++;}}return count;}
export function offsetCaptions(captions,seconds,duration){for(const c of captions){const length=c.end-c.start;c.start=clamp(c.start+seconds,0,Math.max(0,duration-.05));c.end=Math.min(duration,c.start+length);}return captions.filter(c=>c.end>c.start+.01);}
export function splitLongCaptions(captions,maxChars=24){
 const out=[];for(const c of captions){const chunks=[];for(const row of c.text.split('\n'))for(let i=0;i<row.length;i+=maxChars)chunks.push(row.slice(i,i+maxChars));if(chunks.length<=1){out.push(c);continue;}const unit=(c.end-c.start)/chunks.length;chunks.forEach((text,i)=>out.push({...c,id:i?id():c.id,text,start:c.start+i*unit,end:c.start+(i+1)*unit}));}return out;
}
export function mergeAdjacentCaptions(captions,gap=.25){const rows=[...captions].sort((a,b)=>a.start-b.start),out=[];for(const c of rows){const last=out.at(-1);if(last&&c.start-last.end<=gap){last.text=`${last.text}${/[，。！？!?]$/.test(last.text)?'':'，'}${c.text}`;last.end=Math.max(last.end,c.end);}else out.push({...c});}return out;}
