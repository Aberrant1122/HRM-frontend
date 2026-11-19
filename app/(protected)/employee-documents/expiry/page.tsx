"use client";
import Link from "next/link";
import {useState} from "react";
import {getAuthToken} from "@/lib/auth/token";
import {employeeDocumentGet} from "@/lib/employee-document-api";
type Row={revisionId:number;fullName:string;title:string;number:number;expiryDate:string;reminderDate:string};
export default function ExpiryQueue(){
 const [date,setDate]=useState(""),[asOf,setAsOf]=useState(""),[rows,setRows]=useState<Row[]>([]),[more,setMore]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function load(before?:number){
  const token=getAuthToken(),day=before?asOf:date;if(!token||!day||busy)return;
  setError("");setBusy(true);
  try{const data=await employeeDocumentGet<{rows:Row[];hasMore:boolean}>(token,"expiry?asOf="+day+(before?"&before="+before:""));
   if(token===getAuthToken()){setRows(old=>before?[...old,...data.rows]:data.rows);setMore(data.hasMore);setAsOf(day);}}
  catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-3xl space-y-4 p-6"><Link className="underline" href="/employee-documents">Employee documents</Link>
  <h1 className="text-2xl font-bold">Document expiry reminders</h1>
  <form onSubmit={e=>{e.preventDefault();void load();}}><label>Show reminders due by<input className="block border" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><button disabled={busy}>Load reminders</button></form>
  {error&&<p role="alert">{error}</p>}{asOf&&<h2>Reminders due by {asOf}</h2>}{asOf&&!rows.length&&<p>No due reminders.</p>}
  {rows.map(r=><article key={r.revisionId} className="rounded border p-3"><h3>{r.title} · version {r.number}</h3><p>{r.fullName} · {r.expiryDate<asOf?"Expired":"Expires"} {r.expiryDate} · reminder {r.reminderDate}</p></article>)}
  {more&&<button disabled={busy} onClick={()=>load(rows[rows.length-1].revisionId)}>Earlier document revisions</button>}</main>;
}
