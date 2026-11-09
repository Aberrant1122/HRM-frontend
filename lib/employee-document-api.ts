import {getAuthToken} from './auth/token';
const base=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,'');
export type Saved={scope:string;body:Record<string,unknown>;file?:File};
async function storage(scope:string,value?:Saved|null):Promise<Saved|undefined>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('hrm-employee-document-command-recovery',1);r.onupgradeneeded=()=>r.result.createObjectStore('commands',{keyPath:'scope'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Retry storage unavailable'));});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('commands',value===undefined?'readonly':'readwrite'),s=tx.objectStore('commands'),r=value===undefined?s.get(scope):value===null?s.delete(scope):s.add(value);let result:Saved|undefined;r.onsuccess=()=>{result=r.result as Saved|undefined;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Retry storage unavailable. No new change was sent.'));});}finally{db.close();}
}
function scope(token:string,id:string){if(!/^(uploads|roles\/commands)$/.test(id))throw Error('Invalid document scope');return base+':'+JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).id+':'+id;}
export const pendingEmployeeDocument=(token:string,id:string)=>storage(scope(token,id));
export async function employeeDocumentGet<T>(token:string,path:string):Promise<T>{const r=await fetch(base+'/employee-documents/'+path,{headers:{Authorization:'Bearer '+token},cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.message||'Employee documents unavailable');return data.data as T;}
export async function employeeDocumentSave<T=Record<string,unknown>>(token:string,id:string,body?:Record<string,unknown>,retry=false,file?:File):Promise<{data:T;replayed?:boolean;appliedVersion?:number}>{
  const key=scope(token,id),prior=await storage(key);if(prior&&!retry)throw Error('Retry the retained change first');if(!prior&&!body)throw Error('No retained change found');
  if(id==='uploads'&&!prior&&!file)throw Error('Choose a PDF before uploading');const saved=prior||{scope:key,body:{...body,commandKey:crypto.randomUUID()},...(file&&{file})};if(!prior)await storage(key,saved);
  for(let attempt=0;attempt<2;attempt++){
    if(getAuthToken()!==token)throw Error('Account changed. The original command remains retained.');
    try{let payload:BodyInit=JSON.stringify(saved.body);const headers:Record<string,string>={Authorization:'Bearer '+token};if(id==='uploads'){if(!saved.file)throw Error('Retained PDF is unavailable');const form=new FormData();form.set('command',JSON.stringify(saved.body));form.set('file',saved.file,saved.file.name);payload=form;}else headers['Content-Type']='application/json';const r=await fetch(base+'/employee-documents/'+id,{method:'POST',headers,body:payload}),result=await r.json();
      if(r.ok){try{await storage(key,null);}catch{/* Committed UUID remains safe to replay. */}return result;}
      if([400,404].includes(r.status)||r.status===409&&!String(result.message).includes('bound'))await storage(key,null);
      if(r.status<500)throw Object.assign(Error(result.message||'Change rejected'),{definitive:true});
    }catch(e){if(e instanceof Error&&'definitive' in e)throw e;}
  }
  throw Error('Save outcome is uncertain. Retry the retained change.');
}

export async function downloadEmployeeDocument(token:string,revisionId:number){const r=await fetch(base+'/employee-documents/revisions/'+revisionId+'/download',{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!r.ok){const b=await r.json();throw Error(b.message||'Employee document unavailable');}const blob=await r.blob();if(getAuthToken()!==token)throw Error('Account changed');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='employee-document-revision-'+revisionId+'.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
