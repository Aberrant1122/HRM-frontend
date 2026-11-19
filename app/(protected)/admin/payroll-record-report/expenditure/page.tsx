"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {getAuthToken} from "@/lib/auth/token";
type Group={currency:string|null;gross:string|null;payrollRows:number};
type Amounts={totals:Group[];periods:number;payrollRows:number};
type Row=Amounts&{employeeId:number;fullName:string};
type Data={from:string;to:string;summary:Amounts&{employees:number;notMarkedPaid:number};rows:Row[];hasMore:boolean};
const endpoint=(process.env.NEXT_PUBLIC_BACKEND_URL||"http://localhost:5005/api/").replace(/\/$/,"")+"/payroll-record-report/expenditure";
export default function WorkforceExpenditure(){
 const [from,setFrom]=useState(""),[to,setTo]=useState(""),[data,setData]=useState<Data>(),[busy,setBusy]=useState(false),[error,setError]=useState(""),gen=useRef(0);
 useEffect(()=>()=>{gen.current++;},[]);
 async function run(before?:number){
  const token=getAuthToken();if(!token||busy)return;const n=++gen.current;setBusy(true);setError("");
  if(!before)setData(undefined);
  try{
   const params=new URLSearchParams({from:before&&data?data.from:from,to:before&&data?data.to:to});if(before)params.set("before",String(before));
   const res=await fetch(endpoint+"?"+params,{headers:{Authorization:"Bearer "+token},cache:"no-store"}),next=await res.json();
   if(!res.ok)throw Error(next.message||"Report unavailable");
   if(gen.current===n&&token===getAuthToken())setData(old=>({...next,rows:before?[...(old?.rows||[]),...next.rows]:next.rows}));
  }catch(e){if(gen.current===n)setError((e as Error).message);}finally{if(gen.current===n)setBusy(false);}
 }
 return <main className="space-y-4 p-6"><Link className="underline" href="/admin/payroll-record-report">Payroll record report</Link>
 <h1 className="text-2xl font-bold">Employee and workforce payroll expenditure</h1>
 <p>Workforce expenditure is gross payroll recorded as paid, grouped by currency and selected by pay-period end date. Historical rows awaiting currency classification are counted separately.</p>
 <form onSubmit={e=>{e.preventDefault();void run();}}><fieldset disabled={busy} className="space-y-2"><label>Period ending from<input className="block border" type="date" required max={to||undefined} value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Period ending through<input className="block border" type="date" required min={from||undefined} value={to} onChange={e=>setTo(e.target.value)}/></label><button>Run expenditure report</button></fieldset></form>
 {error&&<p role="alert">{error}</p>}{busy&&<p>Loading…</p>}{data&&<><h2>Recorded paid payroll · {data.from} – {data.to}</h2>
 <p>{data.summary.employees} employees · {data.summary.periods} periods · {data.summary.payrollRows} paid records · {data.summary.notMarkedPaid} records with another status</p>
 {data.summary.totals.map(t=><p key={t.currency || 'unknown'}>{t.currency ? 'Paid gross '+t.currency+' '+t.gross : 'Unclassified currency'} · {t.payrollRows} records</p>)}
 <table className="w-full text-left"><thead><tr>{['Employee','Periods','Paid records','Paid gross by currency'].map(h=><th key={h}>{h}</th>)}</tr></thead>
 <tbody>{data.rows.map(r=><tr key={r.employeeId}><td>{r.fullName} · #{r.employeeId}</td><td>{r.periods}</td><td>{r.payrollRows}</td><td>{r.totals.map(t=><p key={t.currency || 'unknown'}>{t.currency ? t.currency+' '+t.gross : 'Unclassified · '+t.payrollRows+' records'}</p>)}</td></tr>)}</tbody></table>
 {data.hasMore&&<button disabled={busy} onClick={()=>run(data.rows[data.rows.length-1].employeeId)}>More employee costs</button>}</>}</main>;
}
