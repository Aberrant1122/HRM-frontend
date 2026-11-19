import { getAuthToken } from './auth/token';
export const correctionBase=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,'');
export type SavedHRCommand={scope:string;path:string;body:Record<string,unknown>};
async function storage(scope:string,value?:SavedHRCommand|null):Promise<SavedHRCommand|undefined>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('hrm-hr-command-recovery',1);r.onupgradeneeded=()=>r.result.createObjectStore('commands',{keyPath:'scope'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Command retry storage is unavailable'));});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('commands',value===undefined?'readonly':'readwrite'),s=tx.objectStore('commands'),r=value===undefined?s.get(scope):value===null?s.delete(scope):s.add(value);let result:SavedHRCommand|undefined;r.onsuccess=()=>{result=r.result as SavedHRCommand|undefined;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Command retry storage is unavailable. No new change was sent.'));});}finally{db.close();}
}
const scoped=(token:string,scope:string)=>correctionBase+':'+String(JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).id)+':'+scope;
export const savedHRCommand=(token:string,scope:string)=>storage(scoped(token,scope));
export async function correctionFetch<T>(token:string,path:string):Promise<T>{const r=await fetch(correctionBase+'/attendance/'+path,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.message||'Attendance workflow unavailable');return data as T;}
export async function hrCommand<T>(token:string,scope:string,path:string,body?:Record<string,unknown>,retry=false):Promise<T>{
  const key=scoped(token,scope),prior=await storage(key);
  if(prior&&!retry)throw Error('A saved change is awaiting confirmation. Retry that change first.');
  if(!prior&&!body)throw Error('No saved command found. Refresh before continuing.');
  const saved=prior||{scope:key,path,body:{...body,commandKey:crypto.randomUUID()}};
  if(!['corrections/commands','correction-permissions/commands'].includes(saved.path))throw Error('Invalid saved command');
  if(!prior)await storage(key,saved);
  let message='Change outcome is unconfirmed. Retry the saved change.';
  for(let attempt=0;attempt<2;attempt++){
    if(getAuthToken()!==token)throw Error('Account changed. The original command remains saved.');
    try{
      const response=await fetch(correctionBase+'/attendance/'+saved.path,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(saved.body)});
      const result=await response.json();
      if(response.ok){try{await storage(key,null);}catch(_){/* Keep committed result successful; retained key is safe to replay. */}return result as T;}
      message=result.message||message;
      if([400,404].includes(response.status)||response.status===409&&!message.includes('bound'))await storage(key,null);
      if(response.status<500)throw Object.assign(Error(message),{definitive:true});
    }catch(error){if(error instanceof Error&&'definitive' in error)throw error;}
  }
  throw Error(message);
}
