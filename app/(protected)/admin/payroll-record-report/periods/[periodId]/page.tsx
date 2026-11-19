"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useCallback,useEffect,useRef,useState} from "react";
import {payrollStatement,PayPeriod,PayGroup,PayRow} from "@/lib/payroll-statements";
type View={period:PayPeriod;groups:PayGroup[];rows:PayRow[];hasMore:boolean};
export default function PayrollPeriodStatement(){
 const {periodId}=useParams<{periodId:string}>(),[data,setData]=useState<View>(),[busy,setBusy]=useState(false),[error,setError]=useState(""),seq=useRef(0);
 const load=useCallback(async(before?:number)=>{
  const n=++seq.current;setBusy(true);setError("");
  try{const v=await payrollStatement<View>(periodId+(before?"?before="+before:""));if(seq.current===n)setData(old=>({...v,rows:before?[...(old?.rows||[]),...v.rows]:v.rows}));}
  catch(e){if(seq.current===n)setError((e as Error).message);}finally{if(seq.current===n)setBusy(false);}
 },[periodId]);
 useEffect(()=>{setData(undefined);void load();return()=>{seq.current++;};},[load]);
 return <main className="space-y-4 p-6"><Link className="underline" href="/admin/payroll-record-report">Payroll record report</Link>
 <h1 className="text-2xl font-bold">Payroll period summary</h1>{error&&<p role="alert">{error} <button onClick={()=>load()}>Retry</button></p>}
 {data&&<><h2>{data.period.name}</h2><a className="underline" href={"/admin/payroll-record-report/currency/period/"+periodId}>Period currency</a><Link className="underline" href={"/admin/payroll-record-report/periods/"+periodId+"/overtime"}>Recorded overtime and additional hours</Link><p>{data.period.startDate} – {data.period.endDate} · {data.period.type} · {data.period.status}</p>
 <p>Totals are grouped by recorded payroll currency. Unclassified rows show their original amounts individually.</p>
 <table className="w-full text-left"><thead><tr>{["Status","Records","Gross","Deductions","Net"].map(h=><th key={h}>{h}</th>)}</tr></thead>
 <tbody>{data.groups.map(g=><tr key={g.status+":"+g.currency}><td>{g.status} · {g.currency || "Unclassified"}</td><td>{g.records}</td><td>{g.gross ?? "—"}</td><td>{g.deductions ?? "—"}</td><td>{g.net ?? "—"}</td></tr>)}</tbody></table>
 {!data.rows.length&&<p>No payroll rows recorded.</p>}
 {data.rows.map(r=><article className="rounded border p-3" key={r.id}><h3>{r.fullName} · #{r.employeeId}</h3><p>{r.status} · {r.currency || "Currency unclassified"} · gross {r.gross} · deductions {r.deductions} · net {r.net}</p>
 <Link className="underline" href={"/admin/payroll-record-report/periods/"+periodId+"/payslips/"+r.id}>Open payslip for {r.fullName}</Link></article>)}
 {data.hasMore&&<button disabled={busy} onClick={()=>load(data.rows[data.rows.length-1].id)}>More payroll rows</button>}</>}
 {busy&&<p>Loading…</p>}</main>;
}
