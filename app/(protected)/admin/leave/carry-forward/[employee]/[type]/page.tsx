"use client";
import {useState,useEffect} from 'react';
import {useParams} from 'next/navigation';
import {getAuthToken} from '@/lib/auth/token';
type Rule={revision:number;mode:string;cap:string|null;expiry:string|null;reason:string;actorId:number};
type Detail={policyId:number;policyName:string;version:number;sourceEnd:string;sourceRemaining:number|null;preview:number|null;previewIssue:string|null;rows:Rule[];hasMore:boolean};
type Command={policyId:number;expectedRevision:number;mode:string;cap:number|null;expiry:string|null;reason:string;commandKey:string};
const base=(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/,'');
export default function Carry(){
 const {employee,type}=useParams<{employee:string;type:string}>(),[date,setDate]=useState(''),[target,setTarget]=useState('');
 return <main className="p-6 space-y-4 max-w-3xl"><h1>Leave carry-forward rule</h1><form onSubmit={e=>{e.preventDefault();setTarget(date);}}>
 <label>Receiving leave period start <input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label> <button>Open period</button></form>
 {target&&<Editor key={employee+':'+type+':'+target} employee={employee} type={type} target={target}/>}</main>;
}
function Editor({employee,type,target}:{employee:string;type:string;target:string}){
 const token=getAuthToken() || '',endpoint=base+'/leaves/carry-forward/'+employee+'/'+type+'?target='+target,storage='carry-rule:'+endpoint+':'+(token.split('.')[1] || '');
 const [data,setData]=useState<Detail|null>(null),[pending,setPending]=useState<Command|null>(null),[mode,setMode]=useState(''),[cap,setCap]=useState(''),[expiry,setExpiry]=useState(''),[reason,setReason]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[recheck,setRecheck]=useState(0);
 async function request(path:string,body?:Command){const r=await fetch(endpoint+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)})});
 const result=await r.json();if(!r.ok)throw Object.assign(Error(result.message || 'Carry rule unavailable'),{status:r.status});return result;}
 useEffect(()=>{let active=true;try{const saved=sessionStorage.getItem(storage);if(saved)setPending(JSON.parse(saved));}catch{setMessage('Retry storage unavailable');return;}
 request('').then((d:Detail)=>{if(active){setData(d);setMode(d.rows[0]?.mode || '');setCap(d.rows[0]?.cap || '');setExpiry(d.rows[0]?.expiry || '');setReason('');}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[token,storage,recheck]);
 async function save(body:Command){if(busy)return;setBusy(true);try{sessionStorage.setItem(storage,JSON.stringify(body));setPending(body);await request('',body);sessionStorage.removeItem(storage);setPending(null);setMessage('Rule revision recorded');setRecheck(n=>n+1);}
 catch(e){const err=e as Error & {status?:number};setMessage(err.message);if([400,403,404,409].includes(err.status||0)){sessionStorage.removeItem(storage);setPending(null);}}finally{setBusy(false);}}
 async function older(){if(!data)return;setBusy(true);try{const next:Detail=await request('&before='+data.rows[data.rows.length-1].revision);setData({...data,rows:[...data.rows,...next.rows],hasMore:next.hasMore});}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section className="space-y-4">{message&&<p role="status">{message}</p>}{pending&&<button disabled={busy} onClick={()=>save(pending)}>Retry unconfirmed rule</button>}
 {data&&<><h2>{data.policyName} · Receiving period {target}</h2><p>This rule covers this leave type for employees assigned this policy. Preview uses the selected employee’s balance.</p>
 <form onSubmit={e=>{e.preventDefault();void save({policyId:data.policyId,expectedRevision:data.version,mode,cap:mode==='capped'?Number(cap):null,expiry:mode==='none'?null:expiry||null,reason,commandKey:crypto.randomUUID()});}}>
 <fieldset className="border p-4 grid gap-3" disabled={busy||!!pending}><legend>Carry-forward configuration</legend><label>Rule <select value={mode} onChange={e=>setMode(e.target.value)} required>
 <option value="">Select rule</option><option value="none">No carry-forward</option><option value="capped">Carry unused days up to a cap</option><option value="uncapped">Carry unused days without a cap</option></select></label>
 {mode==='capped'&&<label>Maximum days <input type="number" step=".5" min=".5" value={cap} onChange={e=>setCap(e.target.value)} required/></label>}
 {mode&&mode!=='none'&&<label>Expiry date (optional) <input type="date" min={target} value={expiry} onChange={e=>setExpiry(e.target.value)}/></label>}
 <label>Reason <input maxLength={500} required value={reason} onChange={e=>setReason(e.target.value)}/></label><button>Save rule revision</button></fieldset></form>
 <p>Balance preview for period ending {data.sourceEnd}: {data.sourceRemaining ?? 'Unavailable'} days. Projected carry: {data.preview ?? 'Unavailable'} days.</p>
 {data.previewIssue&&<p>{data.previewIssue}</p>}<p>Previewing or saving a rule leaves employee balances unchanged.</p>
 {data.rows.map(r=><article key={r.revision}><h3>Revision {r.revision}</h3><p>{r.mode} · Cap {r.cap ?? '—'} · Expiry {r.expiry ?? '—'} · {r.reason} · Account {r.actorId}</p></article>)}
 {data.hasMore&&<button onClick={older} disabled={busy}>Earlier rule revisions</button>}</>}<button disabled={busy} onClick={()=>setRecheck(n=>n+1)}>Reload rule</button></section>;
}
