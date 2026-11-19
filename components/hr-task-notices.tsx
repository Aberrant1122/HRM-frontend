"use client";
import {useEffect,useRef,useState} from "react";
import {OrganizationChoice} from '@/components/organization-choice';
import {hrTaskGet} from '@/lib/hr-task-api';
import type {Person} from '@/lib/organization-api';
import {getAuthToken} from "@/lib/auth/token";
const base=(process.env.NEXT_PUBLIC_BACKEND_URL||"http://localhost:5005/api/").replace(/\/$/,"")+"/hr-tasks/notices";
type Row={id:string;taskId:number;taskTitle:string;stage?:string|null;dueDate:string;asOf:string;readAt:string|null};
async function request<T>(path:string,body?:object):Promise<T>{
 const token=getAuthToken();if(!token)throw Error("Sign in to see notices");
 const res=await fetch(base+path,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},cache:"no-store",body:body?JSON.stringify(body):undefined});
 const data=await res.json();if(getAuthToken()!==token)throw Error("Account changed");if(!res.ok)throw Error(data.message||"Task notices unavailable");return data.data;
}
export function SendTaskNotice({taskId,version,dueDate,recipient,stage,stageVersion}:{taskId:number;version:number;dueDate:string;recipient:string;stage:"submission"|"approval";stageVersion:number}){
 const [selected,setSelected]=useState(""),[date,setDate]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const attempt=useRef<{date:string;id:string}|undefined>(undefined);
 async function send(){
  if(busy)return;setBusy(true);setMessage("");
  try{if(attempt.current?.date!==date+":"+selected)attempt.current={date:date+":"+selected,id:crypto.randomUUID()};
    await request("",{id:attempt.current.id,taskId,expectedVersion:version,expectedDeadlineVersion:stageVersion,asOf:date,...(stage==="approval"&&{approvalRecipientId:Number(selected)})});setMessage(stage==="approval"?"Approval notice delivered":"Notice delivered to "+recipient);
  }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
 }
 return <form aria-label="Send overdue notice" className="space-y-2 rounded border p-3" onSubmit={e=>{e.preventDefault();void send();}}>
  <h3>Send overdue notice</h3><p>{stage==="approval"?"Approval":"Submission"} deadline {dueDate}.</p>{stage==="approval"?<OrganizationChoice findAccounts={(t,search)=>hrTaskGet<Person[]>(t,'approval-accounts?mode=notice&taskId='+taskId+'&search='+encodeURIComponent(search))} kind="accounts" value={selected} selected={selected} onChange={setSelected} labelOverride="Approval recipient"/>:<p>Assigned to {recipient}.</p>}<label>Overdue review date<input className="block border" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
  <button disabled={busy||!date||date<=dueDate||(stage==="approval"&&!selected)}>Send in-app notice</button>{message&&<p role="status">{message}</p>}</form>;
}
export function MyTaskNotices(){
 const [rows,setRows]=useState<Row[]>([]),[page,setPage]=useState(1),[more,setMore]=useState(false),[revision,refresh]=useState(0),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;setLoading(true);setError("");setRows([]);
  request<{rows:Row[];hasMore:boolean}>("?page="+page).then(d=>{if(live){setRows(d.rows);setMore(d.hasMore);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};
 },[page,revision]);
 async function read(id:string){try{await request("/"+id+"/read",{});refresh(n=>n+1);}catch(e){setError((e as Error).message);}}
 return <section className="m-6 max-w-4xl space-y-3 rounded border p-4"><h2 className="text-lg font-semibold">My overdue task notices</h2>
  {error&&<p role="alert">{error} <button onClick={()=>refresh(n=>n+1)}>Retry notices</button></p>}{loading&&<p>Loading…</p>}
  {!loading&&!error&&!rows.length&&<p>No overdue notices.</p>}{rows.map(r=><article className="border-t py-2" key={r.id}><h3>{r.taskTitle}</h3><p>{r.stage || "Legacy unclassified"} deadline {r.dueDate} · overdue on {r.asOf}</p>
  {r.readAt?<p>Read</p>:<button onClick={()=>read(r.id)}>Mark notice read</button>}</article>)}<button disabled={page===1||loading} onClick={()=>setPage(n=>n-1)}>Previous notices</button> <button disabled={!more||loading} onClick={()=>setPage(n=>n+1)}>Next notices</button></section>;
}
