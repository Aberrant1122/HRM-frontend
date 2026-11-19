"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {getAuthToken} from "@/lib/auth/token";
type Row={id:string;title:string;firstDate:string;endDate:string|null;intervalDays:number;stoppedAt:string|null;stopReason:string|null};
const url=(process.env.NEXT_PUBLIC_BACKEND_URL||"http://localhost:5005/api/").replace(/\/$/,"")+"/hr-tasks/reminders";
async function request<T>(query:string,body?:object):Promise<T>{
 const token=getAuthToken();if(!token)throw Error("Sign in to view reminders");
 const res=await fetch(url+query,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},cache:"no-store",body:body?JSON.stringify(body):undefined});
 const data=await res.json();if(getAuthToken()!==token)throw Error("Account changed");if(!res.ok)throw Error(data.message||"Reminder schedules unavailable");return data;
}
export default function HrReminders(){
 const [on,setOn]=useState(""),[mode,setMode]=useState("due"),[page,setPage]=useState(1),[rows,setRows]=useState<Row[]>([]),[more,setMore]=useState(false);
 const [title,setTitle]=useState(""),[first,setFirst]=useState(""),[end,setEnd]=useState(""),[days,setDays]=useState(""),[selected,setSelected]=useState(""),[reason,setReason]=useState("");
 const [error,setError]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 const attempt=useRef<{body:string;id:string}|undefined>(undefined);
 const refresh=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{const now=new Date();setOn([now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-"));},[]);
 useEffect(()=>{
  if(mode==="due"&&!on)return;let live=true;setLoading(true);setRows([]);
  request<{rows:Row[];hasMore:boolean}>("?mode="+mode+"&page="+page+(mode==="due"?"&on="+on:"")).then(data=>{if(live){setRows(data.rows);setMore(data.hasMore);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[on,mode,page,revision]);
 async function save(stop?:string){
  if(busy)return;setBusy(true);setError("");
  try{
   if(stop){await request("",{action:"stop",id:stop,reason});setSelected("");setReason("");}
   else{
    const fields={action:"create",title,firstDate:first,endDate:end||null,intervalDays:Number(days)},key=JSON.stringify(fields);
    if(attempt.current?.body!==key)attempt.current={body:key,id:crypto.randomUUID()};
    await request("",{...fields,id:attempt.current.id});attempt.current=undefined;
    setTitle("");setFirst("");setEnd("");setDays("");setMode("all");setPage(1);
   }
   refresh();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-3xl space-y-5 p-6"><Link className="underline" href="/admin/hr-tasks">HR tasks and deadlines</Link>
  <h1 className="text-2xl font-bold">My recurring HR reminders</h1>
  <form onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy} className="space-y-2 rounded border p-4"><legend>Create reminder</legend>
  <label>Reminder title<input className="block border" required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <label>First occurrence<input className="block border" required type="date" value={first} onChange={e=>setFirst(e.target.value)}/></label>
  <label>Repeat every (days)<input className="block border" required type="number" min={1} max={3660} value={days} onChange={e=>setDays(e.target.value)}/></label>
  <label>Last occurrence on or before (optional)<input className="block border" type="date" min={first||undefined} value={end} onChange={e=>setEnd(e.target.value)}/></label><button>Create recurring reminder</button></fieldset></form>
  <label>Reminder view<select className="block border" value={mode} onChange={e=>{setMode(e.target.value);setPage(1);}}><option value="due">Due on selected date</option><option value="all">All my schedules</option></select></label>
  {mode==="due"&&<label>Reminder date<input className="block border" type="date" value={on} onChange={e=>{setOn(e.target.value);setPage(1);}}/></label>}
  {error&&<p role="alert">{error} <button onClick={refresh}>Refresh reminders</button></p>}
  {loading?<p>Loading…</p>:!rows.length&&!error&&<p>No matching reminders.</p>}
  {rows.map(r=><article key={r.id} className="rounded border p-3"><h2>{r.title}</h2><p>Every {r.intervalDays} days from {r.firstDate}{r.endDate&&" through "+r.endDate}</p>
   {r.stoppedAt?<p>Stopped · {r.stopReason}</p>:selected!==r.id?<button onClick={()=>{setSelected(r.id);setReason("");}}>Stop recurrence</button>:<form onSubmit={e=>{e.preventDefault();void save(r.id);}}><label>Reason to stop<input required maxLength={300} value={reason} onChange={e=>setReason(e.target.value)}/></label> <button disabled={busy}>Confirm stop</button></form>}</article>)}
  <button disabled={page===1||loading} onClick={()=>setPage(n=>n-1)}>Previous page</button> <button disabled={!more||loading} onClick={()=>setPage(n=>n+1)}>Next page</button></main>;
}
