const cache=new Map();
export function imageFor(data){return cache.get(data)?.image||null;}
export function loadImage(data){if(cache.has(data))return cache.get(data).promise;const image=new Image();const promise=new Promise((resolve,reject)=>{image.onload=()=>resolve(image);image.onerror=()=>{cache.delete(data);reject(Error('图片读取失败，请重新上传'));};image.src=data;});cache.set(data,{image,promise});return promise;}
export async function prepareImages(project){await Promise.all([...(project.motions||[]).flatMap(m=>(m.images||[]).filter(Boolean)),...(project.layers||[]).filter(l=>l.kind==='image'&&l.data).map(l=>l.data)].map(loadImage));}
export async function importImage(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>10*1024*1024)throw Error('请上传 10 MB 以内的 JPG、PNG 或 WebP 图片');
 const url=URL.createObjectURL(file);try{const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('图片文件无法读取'));i.src=url;});const scale=Math.min(1,1200/Math.max(image.width,image.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(image.width*scale));c.height=Math.max(1,Math.round(image.height*scale));c.getContext('2d').drawImage(image,0,0,c.width,c.height);const data=c.toDataURL('image/webp',.85);await loadImage(data);return data;}finally{URL.revokeObjectURL(url);}
}
