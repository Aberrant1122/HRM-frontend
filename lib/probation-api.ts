import { getAuthToken } from './auth/token';
const base=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,'');
export type Person={id:number;fullName:string;email:string;role:string;status:string};
export type Probation={id:number;employeeId:number;startDate:string;endDate:string;evaluationDate:string|null;status:string;decisionDate:string|null;version:number};
export type Event={id:number;actorId:number;sourceId:number|null;version:number;action:string;details:{reason:string;feedback?:string;category?:string;source?:{fullName:string};before:Probation|null;after:Probation};createdAt:string};
export type Snapshot={employee:Person;legacy:{startDate:string|null;probationEndDate:string|null;employmentStatus:string|null}|null;probation:Probation|null;history:Event[];hasEarlierHistory:boolean;people:Person[]};
export type Saved={scope:string;body:Record<string,unknown>};
async function storage(scope:string,value?:Saved|null):Promise<Saved|undefined>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('hrm-probation-command-recovery',1);r.onupgradeneeded=()=>r.result.createObjectStore('commands',{keyPath:'scope'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Retry storage unavailable'));});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('commands',value===undefined?'readonly':'readwrite'),s=tx.objectStore('commands'),r=value===undefined?s.get(scope):value===null?s.delete(scope):s.add(value);let result:Saved|undefined;r.onsuccess=()=>{result=r.result as Saved|undefined;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Retry storage unavailable. No new change was sent.'));});}finally{db.close();}
}
function scope(token:string,id:string){if(!/^\d+$/.test(id))throw Error('Invalid employee');return base+':'+JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).id+':'+id;}
export const pendingProbation=(token:string,id:string)=>storage(scope(token,id));
export async function probationGet<T>(token:string,path:string):Promise<T>{const r=await fetch(base+'/probation/'+path,{headers:{Authorization:'Bearer '+token},cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.message||'Probation unavailable');return data.data as T;}
export async function probationSave(token:string,id:string,body?:Record<string,unknown>,retry=false):Promise<{data:Snapshot;replayed:boolean}>{
  const key=scope(token,id),prior=await storage(key);if(prior&&!retry)throw Error('Retry the retained change first');if(!prior&&!body)throw Error('No retained change found');
  const saved=prior||{scope:key,body:{...body,commandKey:crypto.randomUUID()}};if(!prior)await storage(key,saved);
  for(let attempt=0;attempt<2;attempt++){
    if(getAuthToken()!==token)throw Error('Account changed. The original command remains retained.');
    try{const r=await fetch(base+'/probation/employee/'+id+'/commands',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(saved.body)}),result=await r.json();
      if(r.ok){try{await storage(key,null);}catch{/* Committed UUID remains safe to replay. */}return result;}
      if([400,404].includes(r.status)||r.status===409&&!String(result.message).includes('bound'))await storage(key,null);
      if(r.status<500)throw Object.assign(Error(result.message||'Change rejected'),{definitive:true});
    }catch(e){if(e instanceof Error&&'definitive' in e)throw e;}
  }
  throw Error('Save outcome is uncertain. Retry the retained change.');
}
