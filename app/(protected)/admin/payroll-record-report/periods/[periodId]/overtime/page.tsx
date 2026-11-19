"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {payrollStatement,PayPeriod} from "@/lib/payroll-statements";
type Row={currency:string|null;id:number;employeeId:number;fullName:string;status:string;overtimeHours:string|null;workedHours:string|null;overtimePay:string|null};
type View={period:PayPeriod;summary:{records:number;known:number;positive:number;missing:number;totalHours:string|null};rows:Row[];hasMore:boolean};
const number=(value:string|null)=>value===null?"Unrecorded":value.replace(/(\.\d*?[1-9])0+$|\.0+$/,"$1");
export default function OvertimeReport(){
 const {periodId}=useParams<{periodId:string}>(),[data,setData]=useState<View>(),[error,setError]=useState(""),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0),seq=useRef(0);
 useEffect(()=>{
  const n=++seq.current;setBusy(true);setData(undefined);setError("");
  payrollStatement<View>(periodId+"/overtime").then(v=>{if(seq.current===n)setData(v);}).catch(e=>{if(seq.current===n)setError(e.message);}).finally(()=>{if(seq.current===n)setBusy(false);});return()=>{seq.current++;};
 },[periodId,retry]);
 async function more(){
  if(!data||busy)return;const n=seq.current;setBusy(true);
  try{const v=await payrollStatement<View>(periodId+"/overtime?before="+data.rows[data.rows.length-1].id);if(n===seq.current)setData({...v,rows:[...data.rows,...v.rows]});}
  catch(e){if(n===seq.current){setData(undefined);setError((e as Error).message);}}finally{if(n===seq.current)setBusy(false);}
 }
 return <main className="space-y-4 p-6"><Link className="underline" href={"/admin/payroll-record-report/periods/"+periodId}>Payroll period summary</Link>
 <h1 className="text-2xl font-bold">Recorded overtime and additional hours</h1><p>Figures come from saved payroll calculations for this period. Hours worked outside these payroll records require a separate attendance source.</p>
 {error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}{busy&&<p>Loading…</p>}
 {data&&<><h2>{data.period.name}</h2><p>{data.period.startDate} – {data.period.endDate}</p>
 <p>Recorded overtime hours · {number(data.summary.totalHours)}</p><p>{data.summary.positive} with overtime · {data.summary.known} with recorded hours · {data.summary.missing} missing or invalid · {data.summary.records} payroll records</p>
 <table className="w-full text-left"><thead><tr>{["Employee","Payroll status","Worked hours","Overtime hours","Recorded overtime pay"].map(h=><th key={h}>{h}</th>)}</tr></thead>
 <tbody>{data.rows.map(r=><tr key={r.id}><td>{r.fullName} · #{r.employeeId}</td><td>{r.status}</td><td>{number(r.workedHours)}</td><td>{number(r.overtimeHours)}</td><td>{r.currency || "Unclassified"} {number(r.overtimePay)}</td></tr>)}</tbody></table>
 {data.hasMore&&<button disabled={busy} onClick={more}>More overtime records</button>}</>}</main>;
}
