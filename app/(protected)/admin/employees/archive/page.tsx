"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {archiveRequest} from "@/components/employee-archive";
type Row={employeeId:number;fullName:string;actorName:string;createdAt:string};
export default function ArchiveRegister(){
  const [rows,setRows]=useState<Row[]>([]),[more,setMore]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(true);
  async function load(before?:number){
    setBusy(true);setError("");
    try{const page=await archiveRequest<{rows:Row[];hasMore:boolean}>("archive"+(before?"?before="+before:""));
      setRows(old=>before?[...old,...page.rows]:page.rows);setMore(page.hasMore);}
    catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  useEffect(()=>{void load();},[]);
  return <main className="space-y-4 p-6"><Link className="underline" href="/admin/employees">Employee directory</Link>
    <h1 className="text-2xl font-bold">Archived employee records</h1>
    {error&&<p role="alert">{error}</p>}{busy&&<p>Loading…</p>}
    <button className="underline" disabled={busy} onClick={()=>load()}>Refresh records</button>
    {!busy&&!error&&!rows.length&&<p>No archived records.</p>}
    {rows.map(row=><article key={row.employeeId} className="rounded border p-3"><Link className="underline" href={"/admin/employees/"+row.employeeId}>{row.fullName}</Link><p>Archived by {row.actorName} · {new Date(row.createdAt).toLocaleString()}</p></article>)}
    {more&&<button disabled={busy} onClick={()=>load(rows[rows.length-1].employeeId)}>More archived records</button>}</main>;
}
