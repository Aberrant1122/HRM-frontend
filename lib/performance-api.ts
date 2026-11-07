import {getAuthToken} from './auth/token';
const base=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,'');
export type Person={id:number;fullName:string;email:string;role:string;status:string};
export type Form={id:number;name:string;questions:string[]};
export type Evaluation={id:number;formId:number;employeeId:number;reviewerId:number|null;cycle:string;periodStart:string;periodEnd:string;dueDate:string;status:string;version:number;answers:Record<string,string>};
export type Detail={employee:Person;form:Form;reviewer:Person|null;evaluation:Evaluation;history:{id:number;action:string;version:number;createdAt:string;details:{reason:string;feedback?:string;actor:{fullName:string};source?:{fullName:string};recordedByAdmin?:boolean;before:Evaluation|null;after:Evaluation}}[];hasEarlierHistory:boolean};
export type Catalog={rows:Form[];hasMore:boolean};
export type EmployeeList={employee:Person;rows:Evaluation[];hasMore:boolean};
export type Saved={scope:string;body:Record<string,unknown>};
async function storage(scope:string,value?:Saved|null):Promise<Saved|undefined>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('hrm-performance-command-recovery',1);r.onupgradeneeded=()=>r.result.createObjectStore('commands',{keyPath:'scope'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Retry storage unavailable'));});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('commands',value===undefined?'readonly':'readwrite'),s=tx.objectStore('commands'),r=value===undefined?s.get(scope):value===null?s.delete(scope):s.add(value);let result:Saved|undefined;r.onsuccess=()=>{result=r.result as Saved|undefined;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Retry storage unavailable. No new change was sent.'));});}finally{db.close();}
}
function scope(token:string,id:string){if(!/^(forms|employee\/\d+\/commands|reviewer\/evaluation\/\d+\/feedback)$/.test(id))throw Error('Invalid performance scope');return base+':'+JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).id+':'+id;}
export const pendingPerformance=(token:string,id:string)=>storage(scope(token,id));
export async function performanceGet<T>(token:string,path:string):Promise<T>{const r=await fetch(base+'/performance/'+path,{headers:{Authorization:'Bearer '+token},cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.message||'Organization unavailable');return data.data as T;}
export async function performanceSave<T=Detail|{record:Form;replayed:boolean}>(token:string,id:string,body?:Record<string,unknown>,retry=false):Promise<{data:T;replayed?:boolean;appliedVersion?:number}>{
  const key=scope(token,id),prior=await storage(key);if(prior&&!retry)throw Error('Retry the retained change first');if(!prior&&!body)throw Error('No retained change found');
  const saved=prior||{scope:key,body:{...body,commandKey:crypto.randomUUID()}};if(!prior)await storage(key,saved);
  for(let attempt=0;attempt<2;attempt++){
    if(getAuthToken()!==token)throw Error('Account changed. The original command remains retained.');
    try{const r=await fetch(base+'/performance/'+id,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(saved.body)}),result=await r.json();
      if(r.ok){try{await storage(key,null);}catch{/* Committed UUID remains safe to replay. */}return result;}
      if([400,404].includes(r.status)||r.status===409&&!String(result.message).includes('bound'))await storage(key,null);
      if(r.status<500)throw Object.assign(Error(result.message||'Change rejected'),{definitive:true});
    }catch(e){if(e instanceof Error&&'definitive' in e)throw e;}
  }
  throw Error('Save outcome is uncertain. Retry the retained change.');
}
