"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {getAuthToken} from "@/lib/auth/token";
type Group={basis:string;profiles:number;overtimeEligible:number};
type Row={currency:string|null;profileId:number;employeeId:number;fullName:string;basis:string;baseSalary:string;version:number;standardDays:number;standardHours:number;overtimeEligible:number|null;overtimeRate:string|null;taxPercentage:string|null};
type Summary={groups:Group[];rows:Row[];hasMore:boolean};
const base=(process.env.NEXT_PUBLIC_BACKEND_URL||"http://localhost:5005/api/").replace(/\/$/,"")+"/payroll-record-report/compensation";
export default function CompensationSummary(){
 const [basis,setBasis]=useState("all"),[data,setData]=useState<Summary>(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const sequence=useRef(0);
 const load=useCallback(async(before?:number)=>{
  const token=getAuthToken(),n=++sequence.current;if(!token)return;setBusy(true);setError("");
  try{
   const r=await fetch(base+"?basis="+basis+(before?"&before="+before:""),{headers:{Authorization:"Bearer "+token},cache:"no-store"}),next=await r.json();
   if(!r.ok)throw Error(next.message||"Unavailable");
   if(sequence.current===n&&token===getAuthToken())setData(old=>({...next,rows:before?[...(old?.rows||[]),...next.rows]:next.rows}));
  }catch(e){if(sequence.current===n)setError((e as Error).message);}finally{if(sequence.current===n)setBusy(false);}
 },[basis]);
 useEffect(()=>{setData(undefined);void load();return()=>{sequence.current++;};},[load]);
 return <main className="space-y-5 p-6"><Link className="underline" href="/admin/payroll-record-report">Payroll record report</Link>
  <h1 className="text-2xl font-bold">Salary and compensation summary</h1><p>Current payroll profile settings. Each amount uses its recorded pay basis. New profiles record PKR. Historical profiles may have unclassified currency.</p>
  <label>Salary basis<select className="block border" value={basis} onChange={e=>setBasis(e.target.value)}><option value="all">All bases</option><option value="monthly">Monthly</option><option value="hourly">Hourly</option><option value="daily">Daily</option></select></label>
  {busy&&<p>Loading…</p>}{error&&<p role="alert">{error} <button onClick={()=>load()}>Retry</button></p>}
  {data&&<><section aria-label="Summary by salary basis">{data.groups.map(g=><p key={g.basis}>{g.basis} · {g.profiles} profiles · {g.overtimeEligible} overtime eligible</p>)}</section>
  {!data.rows.length?<p>No matching payroll profiles.</p>:<div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Employee","Salary basis","Base rate","Standard days","Standard hours","Overtime eligible","Overtime rate","Tax %","Revision"].map(k=><th key={k}>{k}</th>)}</tr></thead>
  <tbody>{data.rows.map(r=><tr key={r.profileId}><td>{r.fullName} · #{r.employeeId}</td><td>{r.basis}</td><td>{r.currency || "Unclassified"} {r.baseSalary} <a className="underline" href={"/admin/payroll-record-report/currency/profile/"+r.profileId}>Profile currency</a></td><td>{r.standardDays}</td><td>{r.standardHours}</td><td>{r.overtimeEligible===null?"Unrecorded":r.overtimeEligible?"Yes":"No"}</td><td>{r.overtimeRate??"Unrecorded"}</td><td>{r.taxPercentage??"Unrecorded"}</td><td>{r.version}</td></tr>)}</tbody></table></div>}
  {data.hasMore&&<button disabled={busy} onClick={()=>load(data.rows[data.rows.length-1].profileId)}>More payroll profiles</button>}</>}
 </main>;
}
