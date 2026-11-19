"use client";
import {useState,useEffect} from 'react';
import {useParams} from 'next/navigation';
import {getAuthToken} from '@/lib/auth/token';
type Event={id:number;version:number;currency:string|null;details:{reason:string;actor:{fullName:string}}};
type Data={storedCurrency:string|null;currency:string|null;version:number;sourceFingerprint:string;basis:string;history:Event[];hasMore:boolean};
type Body={kind:string;id:number;expectedVersion:number;sourceFingerprint:string;currency:string|null;reason:string;commandKey:string};
const base=(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/,'')+'/payroll-record-report/currency/';
export default function CurrencyPage(){const {kind,id}=useParams<{kind:string;id:string}>();return <Editor key={kind+id} kind={kind} id={id}/>;}
function Editor({kind,id}:{kind:string;id:string}){
 const token=getAuthToken() || '',storage='payroll-currency:'+base+kind+id+':'+(token.split('.')[1] || '');
 const [data,setData]=useState<Data|null>(null),[code,setCode]=useState(''),[reason,setReason]=useState(''),[pending,setPending]=useState<Body|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[revision,setRevision]=useState(0);
 async function request(path:string,body?:Body){const r=await fetch(base+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)})});const out=await r.json();if(!r.ok)throw Object.assign(Error(out.message || 'Currency unavailable'),{status:r.status});return out.data as Data;}
 useEffect(()=>{let active=true;try{const saved=sessionStorage.getItem(storage);if(saved)setPending(JSON.parse(saved));}catch{setMessage('Retry storage unavailable');return;}
 request(kind+'/'+id).then(d=>{if(active){setData(d);setCode(d.currency || '');}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[token,storage,revision]);
 async function save(body:Body){setBusy(true);try{sessionStorage.setItem(storage,JSON.stringify(body));setPending(body);const d=await request('commands',body);sessionStorage.removeItem(storage);setPending(null);setData(d);setCode(d.currency || '');setReason('');setMessage('Currency classification recorded');}
 catch(e){const err=e as Error & {status?:number};setMessage(err.message);if([400,403,404,409].includes(err.status||0)){sessionStorage.removeItem(storage);setPending(null);}}finally{setBusy(false);}}
 async function more(){if(!data)return;setBusy(true);try{const next=await request(kind+'/'+id+'?before='+data.history[data.history.length-1].version);setData({...data,history:[...data.history,...next.history],hasMore:next.hasMore});}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <main className="p-6 space-y-4 max-w-2xl"><h1>Payroll currency</h1><p>{kind} #{id}</p>{message&&<p role="status">{message}</p>}
 {pending&&<button disabled={busy} onClick={()=>save(pending)}>Retry unconfirmed classification</button>}
 {data&&<><p>{data.currency || 'Unclassified'} · {data.basis}</p>{!data.storedCurrency&&<form onSubmit={e=>{e.preventDefault();void save({kind,id:Number(id),expectedVersion:data.version,sourceFingerprint:data.sourceFingerprint,currency:code||null,reason,commandKey:crypto.randomUUID()});}}>
 <fieldset className="grid gap-3" disabled={busy||!!pending}><label>Documented currency code <input maxLength={3} pattern="[A-Z]{3}" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>
 <p>A blank code restores unclassified status. Classification preserves the recorded amounts.</p><label>Evidence or correction reason <input required maxLength={600} value={reason} onChange={e=>setReason(e.target.value)}/></label><button>Save currency classification</button></fieldset></form>}
 {data.history.map(e=><article key={e.id}><h2>Revision {e.version} · {e.currency || 'Unclassified'}</h2><p>{e.details.reason} · {e.details.actor.fullName}</p></article>)}
 {data.hasMore&&<button disabled={busy} onClick={more}>Earlier classifications</button>}</>}<button disabled={busy} onClick={()=>setRevision(n=>n+1)}>Reload currency</button></main>;
}
