import {validateProject,id} from './model.js';
const MAGIC2='LINSILITE2\n',MAGIC3='LINSILITE3\n',encoder=new TextEncoder();
export function packProject(project,file,audioFile=null){validateProject(project);const meta=encoder.encode(JSON.stringify({version:3,project,file:{name:file.name,type:file.type,size:file.size},audio:audioFile?{name:audioFile.name,type:audioFile.type,size:audioFile.size}:null}));if(meta.length>32*1024*1024)throw Error('工程图片较多，请减少图片后再备份');const len=new Uint8Array(4);new DataView(len.buffer).setUint32(0,meta.length);return new Blob([MAGIC3,len,meta,file,...(audioFile?[audioFile]:[])],{type:'application/octet-stream'});}
export async function unpackProject(blob){
 const magic=await blob.slice(0,MAGIC3.length).text(),is3=magic===MAGIC3,is2=magic===MAGIC2;if(blob.size>1200*1024*1024||(!is3&&!is2))throw Error('请选择灵思剪辑 Lite 工程包（.linsi）');
 const magicLength=(is3?MAGIC3:MAGIC2).length,header=await blob.slice(magicLength,magicLength+4).arrayBuffer();if(header.byteLength!==4)throw Error('工程包不完整');const n=new DataView(header).getUint32(0),offset=magicLength+4;if(n>32*1024*1024||n<2||offset+n>=blob.size)throw Error('工程包头部无效');
 let meta;try{meta=JSON.parse(await blob.slice(offset,offset+n).text());}catch{throw Error('工程内容无法解析');}
 const mediaOffset=offset+n,audioSize=is3?(meta.audio?.size||0):0;if(![2,3].includes(meta.version)||typeof meta.file?.name!=='string'||meta.file.name.length>240||typeof meta.file.type!=='string'||meta.file.type.length>80||meta.file.size+audioSize!==blob.size-mediaOffset)throw Error('工程媒体不完整');
 const videoEnd=mediaOffset+meta.file.size,project=meta.project;return{project:{...project,id:id()},file:new File([blob.slice(mediaOffset,videoEnd)],meta.file.name,{type:meta.file.type||'video/mp4'}),audioFile:audioSize?new File([blob.slice(videoEnd)],meta.audio.name,{type:meta.audio.type||'audio/mpeg'}):null};
}
