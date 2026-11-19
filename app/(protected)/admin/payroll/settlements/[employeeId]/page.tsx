"use client";
import {SettlementFinal} from "@/components/settlement-final";
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useParams} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import {getAuthToken} from '@/lib/auth/token';
type Item={kind:string;label:string;amount:string};
type Revision={revision:number;currency:string;items:Item[];credit:string;deduction:string;net:string;reason:string;actorName:string};
type Data={rows:Revision[];hasMore:boolean};
type Body={expectedRevision:number;currency:string;items:Item[];reason:string;commandKey:string};
const blank=():Item=>({kind:'credit',label:'',amount:''});
const base=(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/,'');
function subscribeToken(listener:()=>void){window.addEventListener("storage",listener);return()=>window.removeEventListener("storage",listener)}
export default function SettlementPage(){const {employeeId}=useParams<{employeeId:string}>(),{user}=useAuth(),token=useSyncExternalStore(subscribeToken,()=>localStorage.getItem("token"),()=>null);return user?.role==="admin"&&token?<Editor key={employeeId+":"+user.id+":"+token} employee={employeeId}/>:<p>Current payroll administrator required</p>;}
function Editor({employee}:{employee:string}){
 const token=getAuthToken() || '',endpoint=base+'/offboarding/employee/'+employee+'/settlement-draft',storage='settlement-draft:'+endpoint+':'+(token.split('.')[1] || '');
 const [data,setData]=useState<Data|null>(null),[items,setItems]=useState<Item[]>([blank()]),[currency,setCurrency]=useState('PKR'),[reason,setReason]=useState(''),[pending,setPending]=useState<Body|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[refresh,setRefresh]=useState(0);const generation=useRef(0);
 async function request(path:string,body?:Body){const r=await fetch(endpoint+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)})});
 const result=await r.json();if(!r.ok)throw Object.assign(Error(result.message || 'Draft unavailable'),{status:r.status});return result;}
 useEffect(()=>{const n=++generation.current;
 try{const saved=sessionStorage.getItem(storage);if(saved)setPending(JSON.parse(saved));}catch{setMessage('Retry storage unavailable');return;}
 request('').then((page:Data)=>{if(n!==generation.current)return;setData(page);setCurrency(page.rows[0]?.currency || 'PKR');setItems(page.rows[0]?.items || [blank()]);setReason('');}).catch(e=>{if(n===generation.current)setMessage(e.message);});return()=>{generation.current++;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[refresh,token,storage]);
 async function save(command:Body){
  if(busy)return;setBusy(true);try{sessionStorage.setItem(storage,JSON.stringify(command));setPending(command);await request('',command);sessionStorage.removeItem(storage);setPending(null);setMessage('Draft revision saved');setRefresh(n=>n+1);}
  catch(e){const err=e as Error & {status?:number};setMessage(err.message);if([400,403,404,409].includes(err.status || 0)){sessionStorage.removeItem(storage);setPending(null);}}
  finally{setBusy(false);}
 }
 function change(index:number,part:Partial<Item>){setItems(current=>current.map((item,i)=>i===index?{...item,...part}:item));}
 async function older(){if(!data)return;setBusy(true);try{const more:Data=await request('?before='+data.rows[data.rows.length-1].revision);setData({...more,rows:[...data.rows,...more.rows]});}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <main className="p-6 max-w-3xl space-y-4"><h1>Final settlement draft</h1><a className="underline" href={'/admin/employees/'+employee+'/offboarding'}>Employee clearance</a><p>Draft amounts are retained for review. Saving a revision does not authorize payroll or payment.</p>
 {message&&<p role="status">{message}</p>}{pending&&<button disabled={busy} onClick={()=>save(pending)}>Retry unconfirmed revision</button>}
 <form onSubmit={e=>{e.preventDefault();void save({expectedRevision:data?.rows[0]?.revision || 0,currency,items,reason,commandKey:crypto.randomUUID()});}}>
 <fieldset disabled={busy || !!pending || !data} className="border p-3 space-y-3"><legend>Itemized settlement</legend><label>Currency <input value={currency} readOnly maxLength={3} pattern="[A-Z]{3}" required/></label>
 {items.map((item,i)=><fieldset key={i} className="border p-2"><legend>Item {i+1}</legend><label>Direction <select value={item.kind} onChange={e=>change(i,{kind:e.target.value})}><option value="credit">Credit</option><option value="deduction">Deduction</option></select></label>
 <label>Description or reference <input required maxLength={160} value={item.label} onChange={e=>change(i,{label:e.target.value})}/></label>
 <label>Amount <input required inputMode="decimal" value={item.amount} onChange={e=>change(i,{amount:e.target.value})}/></label>
 {items.length>1&&<button type="button" onClick={()=>setItems(items.filter((_,index)=>index!==i))}>Remove item {i+1}</button>}</fieldset>)}
 <button type="button" disabled={items.length>=50} onClick={()=>setItems([...items,blank()])}>Add settlement item</button>
 <label>Reason for revision <input required value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label><button>Save draft revision</button></fieldset></form>
 {data?.rows.map(r=><article className="border p-3" key={r.revision}><h2>Draft revision {r.revision}</h2><p>Credits {r.currency} {r.credit} · Deductions {r.currency} {r.deduction} · Net {r.currency} {r.net}</p>
 <p>{r.reason} · {r.actorName}</p>{r.items.map((item,i)=><p key={i}>{item.label} · {item.kind} · {r.currency} {item.amount}</p>)}</article>)}
 {data?.hasMore&&<button disabled={busy} onClick={older}>Earlier revisions</button>}<button disabled={busy} onClick={()=>setRefresh(n=>n+1)}>Reload draft</button><SettlementFinal key={employee+":"+token} employee={employee} token={token} revision={data?.rows[0]?.revision||0}/></main>;
}
