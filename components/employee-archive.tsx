"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {getAuthToken} from "@/lib/auth/token";
const base=(process.env.NEXT_PUBLIC_BACKEND_URL||"http://localhost:5005/api/").replace(/\/$/,"")+"/employee/";
type ArchiveEvent={version:number;archived:boolean;actorName:string;reason:string;createdAt:string};
type View={version:number;archived:boolean;history:ArchiveEvent[];hasMore:boolean};
export async function archiveRequest<T>(path:string,body?:object):Promise<T>{
  const token=getAuthToken();if(!token)throw Error("Sign in to view archived records");
  const r=await fetch(base+path,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const value=await r.json();
  if(getAuthToken()!==token)throw Error("Account changed");
  if(!r.ok)throw Error(value.message||"Archive unavailable");
  return value;
}
export function EmployeeArchive({id}:{id:number}){
  const [data,setData]=useState<View>(),[reason,setReason]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const path=id+"/archive";
  const load=useCallback(async()=>{setData(await archiveRequest<View>(path));},[path]);
  useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
  async function change(){
    if(!data||busy)return;
    setBusy(true);setError("");
    try{await archiveRequest(path,{commandKey:crypto.randomUUID(),expectedVersion:data.version,archived:!data.archived,reason});setReason("");}
    catch(e){setError((e as Error).message);}
    finally{try{await load();}catch(e){setError((e as Error).message);}setBusy(false);}
  }
  async function earlier(){
    if(!data||!data.history.length)return;
    setBusy(true);
    try{const page=await archiveRequest<View>(path+"?before="+data.history[data.history.length-1].version);setData({...data,hasMore:page.hasMore,history:[...data.history,...page.history]});}
    catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  return <section aria-label="Employee record archive" className="m-4 space-y-3 rounded border p-4">
    <h2 className="text-lg font-semibold">Employee record archive</h2>
    {error&&<p role="alert">{error} <button onClick={()=>load().catch(e=>setError(e.message))}>Refresh status</button></p>}
    {data&&<><p>Record status · {data.archived?"Archived":"Unarchived"}</p>
    <form onSubmit={e=>{e.preventDefault();void change();}}><label>Archive or restore reason<textarea className="block border" required maxLength={600} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <button className="underline" disabled={busy||!reason.trim()}>{data.archived?"Restore record":"Archive record"}</button></form>
    {data.history.map(e=><p key={e.version}>{e.archived?"Archived":"Restored"} · {e.actorName} · {new Date(e.createdAt).toLocaleString()} · {e.reason}</p>)}
    {data.hasMore&&<button disabled={busy} onClick={earlier}>Earlier archive history</button>}</>}
    <Link className="underline" href="/admin/employees/archive">Archived records</Link></section>;
}
