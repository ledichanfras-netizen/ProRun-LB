import {supabase} from './supabase';
export async function planImportRequest(action:string,athleteId:string,payload:Record<string,unknown>={},signal?:AbortSignal){
 const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Entre novamente para importar a planilha.');
 const response=await fetch('/api/ai/transcribe',{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({...payload,action,athleteId})});
 const result=await response.json().catch(()=>({error:'O servidor não respondeu como esperado. Tente novamente.'}));if(!response.ok)throw new Error(result.error||'Não foi possível importar.');return result;
}
export async function prepareImportFiles(files:File[]){
 if(!files.length||files.length>4)throw new Error('Selecione de 1 a 4 fotos, prints ou PDFs.');
 const result:{name:string;mimeType:string;data:string}[]=[];let bytes=0;
 for(const file of files){
  if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new Error('Use JPG, PNG, WebP ou PDF.');
  if(file.size>12*1024*1024)throw new Error('Um arquivo ultrapassa 12 MB. Envie uma versão menor.');
  let blob:Blob=file;
  if(file.type.startsWith('image/')){
   const bitmap=await createImageBitmap(file).catch(()=>null);if(!bitmap)throw new Error('Não foi possível abrir uma imagem. Envie outra foto.');
   try{const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a imagem.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao preparar a foto.')),'image/jpeg',.9));canvas.width=0;canvas.height=0;}finally{bitmap.close();}
  }
  bytes+=blob.size;if(bytes>6*1024*1024)throw new Error('Envie até 6 MB por leitura. Divida a planilha em partes menores.');
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));reader.readAsDataURL(blob);});
  result.push({name:file.name,mimeType:blob.type,data});
 }
 return result;
}
