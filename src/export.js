import {prepareImages} from './media.js';
import {TRIAL_MAP} from './catalog.js';
import {Input,BlobSource,ALL_FORMATS,CanvasSink,AudioBufferSource as MbAudioBufferSource,Output,BufferTarget,Mp4OutputFormat,CanvasSource,canEncodeVideo} from 'mediabunny';
import {registerAacEncoder} from '@mediabunny/aac-encoder';
import {throwIfExportAborted} from './vendor/exportCancellation.js';
import {drawOverlays} from './render.js';
import {drawVideoFrame} from './composition.js';
import {layoutClips,mapTimelineTime} from './timeline.js';
registerAacEncoder();

async function decodeAudio(file){const ac=new AudioContext();try{return await ac.decodeAudioData(await file.arrayBuffer());}finally{await ac.close();}}
async function renderAudio(file,audioFile,project,sourceHasAudio){
 if(project.duration>1200)throw Error('带混音的工程暂支持 20 分钟以内，请先分段导出');
 let sourceBuffer=null,musicBuffer=null;
 if(sourceHasAudio)try{sourceBuffer=await decodeAudio(file);}catch{throw Error('原视频声音无法解码，无法保证完整混音');}
 if(audioFile)try{musicBuffer=await decodeAudio(audioFile);}catch{throw Error('背景音乐无法读取，请换用常见 MP3、WAV 或 M4A 文件');}
 if(!sourceBuffer&&!musicBuffer)return null;
 const rate=48000,offline=new OfflineAudioContext(2,Math.max(1,Math.ceil(project.duration*rate)),rate);
 if(sourceBuffer)for(const row of layoutClips(project)){const src=offline.createBufferSource(),gain=offline.createGain();src.buffer=sourceBuffer;src.playbackRate.value=row.speed;gain.gain.value=row.muted?0:row.volume;src.connect(gain).connect(offline.destination);src.start(row.timelineStart,row.sourceStart,Math.min(row.sourceEnd-row.sourceStart,sourceBuffer.duration-row.sourceStart));}
 if(musicBuffer&&project.audio){const a=project.audio,src=offline.createBufferSource(),gain=offline.createGain(),start=Math.max(0,a.start),end=Math.min(project.duration,a.end||project.duration),trim=Math.min(a.trimStart||0,Math.max(0,musicBuffer.duration-.01));src.buffer=musicBuffer;src.loop=!!a.loop;src.loopStart=trim;src.loopEnd=musicBuffer.duration;const volume=a.volume??.35;gain.gain.setValueAtTime(a.fadeIn?0:volume,start);if(a.fadeIn)gain.gain.linearRampToValueAtTime(volume,Math.min(end,start+a.fadeIn));if(a.fadeOut){gain.gain.setValueAtTime(volume,Math.max(start,end-a.fadeOut));gain.gain.linearRampToValueAtTime(0,end);}src.connect(gain).connect(offline.destination);src.start(start,trim);src.stop(end);}
 return offline.startRendering();
}

export async function exportVideo(file,project,{height=1080,audioFile=null,signal,onProgress=()=>{}}={}){
 const input=new Input({source:new BlobSource(file),formats:ALL_FORMATS});let output,vs,as;const workers=[];
 // Let in-flight encoder writes settle before releasing their workers. Terminating
 // an AAC worker during add() leaves the encoder's pending promise unresolved.
 const externalSignal=signal,local=new AbortController();const abort=()=>local.abort();
 if(signal?.aborted)local.abort();signal?.addEventListener('abort',abort,{once:true});signal=local.signal;
 try{
  onProgress(0,'检查媒体与编码器');for(const m of project.motions){const spec=TRIAL_MAP[m.type];if(spec?.requiredImages&&(m.images||[]).filter(Boolean).length<spec.requiredImages)throw Error('证据媒体墙需要上传 3 张图片，请补齐或删除该片段');}await prepareImages(project);const track=await input.getPrimaryVideoTrack();if(!track||!await track.canDecode())throw Error('此视频编码暂不支持，请先转换为 H.264 MP4');
  const ratio=Math.min(1,height/Math.min(project.width,project.height)),w=Math.max(2,Math.round(project.width*ratio/2)*2),h=Math.max(2,Math.round(project.height*ratio/2)*2);
  if(!await canEncodeVideo('avc',{width:w,height:h,bitrate:6000000}))throw Error('当前浏览器不支持此尺寸的 MP4 编码，请使用新版 Chrome / Edge 或选择 720p');
  throwIfExportAborted(signal);const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:false}),target=new BufferTarget();
  output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target});vs=new CanvasSource(canvas,{codec:'avc',bitrate:6000000,keyFrameInterval:2});output.addVideoTrack(vs,{frameRate:30});
  const at=await input.getPrimaryAudioTrack(),mixed=await renderAudio(file,audioFile,project,!!at);if(mixed){as=new MbAudioBufferSource({codec:'aac',bitrate:192000});output.addAudioTrack(as);}
  await output.start();
  if(as)workers.push((async()=>{throwIfExportAborted(signal);await as.add(mixed);as.close();})());
  workers.push((async()=>{const count=Math.ceil(project.duration*30),sink=new CanvasSink(track,{width:project.source.width,height:project.source.height,fit:'contain',poolSize:2});const timestamps=Array.from({length:count},(_,i)=>mapTimelineTime(project,i/30).sourceTime);let i=0;
   for await(const frame of sink.canvasesAtTimestamps(timestamps)){throwIfExportAborted(signal);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);if(!frame)throw Error('视频帧读取失败，未生成不完整成片');drawVideoFrame(ctx,frame.canvas,project.canvas,w,h);drawOverlays(ctx,project,i/30,w,h);await vs.add(i/30,Math.min(1/30,project.duration-i/30));i++;if(i%3===0||i===count)onProgress(Math.round(i/count*95),`合成画面 ${i} / ${count} 帧`);}vs.close();})());
  await Promise.all(workers);throwIfExportAborted(signal);onProgress(97,'封装视频与原声');await output.finalize();throwIfExportAborted(signal);onProgress(100,'导出完成');return new Blob([target.buffer],{type:'video/mp4'});
 }catch(e){local.abort();await Promise.allSettled(workers);await output?.cancel().catch(()=>{});throw e;}finally{externalSignal?.removeEventListener('abort',abort);input.dispose();}
}
