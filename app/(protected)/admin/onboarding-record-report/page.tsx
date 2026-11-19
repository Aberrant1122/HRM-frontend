"use client";
import {useEffect,useRef,useState} from 'react';
import {getAuthToken} from '@/lib/auth/token';
import {useAuth} from '@/context/AuthContext';

type Report={source:string;from:string;to:string;total:number;rows:Record<string,string|number|null>[];hasMore:boolean;pageRowCount:number;pageMissing:Record<string,number>;globalUndatedItems:number|null;basis:string;context:string;limitations:string;generatedAt:string};
const names:Record<string,string>={cases:'Checklist creation records',items:'Checklist item deadlines'};
const labels:Record<string,string>={id:'Source record',caseId:'Checklist',employeeId:'Employee account',employeeName:'Current account name',currentAccountRole:'Current login role',currentAccountStatus:'Current account status',currentCaseStatus:'Current checklist status',currentCaseVersion:'Current checklist version',caseCreatedAt:'Checklist created at (UTC)',currentItemCount:'All current items',currentPendingItems:'Current pending items',currentCompletedItems:'Current completed items',currentWaivedItems:'Current waived items',currentUndatedItems:'Current undated items',currentUnassignedItems:'Current unassigned items',title:'Item title',dueDate:'Recorded deadline',currentItemStatus:'Current item status',responsibleId:'Responsible account',currentResponsibleName:'Current responsible name'};

export default function OnboardingReport(){
 const {user}=useAuth(),accountToken=getAuthToken();
 const seq=useRef(0),[source,setSource]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const generation=++seq.current;setReport(null);setMessage('');setBusy(false);return()=>{seq.current=generation+1;};},[user?.id,accountToken]);
 async function load(more=false){
  const token=getAuthToken();if(!token||busy)return;const generation=++seq.current,current=()=>generation===seq.current&&getAuthToken()===token;
  setBusy(true);setMessage('');if(!more)setReport(null);
  const query=more&&report?{source:report.source,from:report.from,to:report.to}:{source,from,to};
  try{
   const params=new URLSearchParams(query);if(more&&report?.rows.length)params.set('before',String(report.rows.at(-1)?.id));
   const base=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,''),response=await fetch(base+'/onboarding-record-report?'+params,{headers:{Authorization:'Bearer '+token},cache:'no-store'}),body=await response.json();
   if(!response.ok)throw Error(body.message||'Report unavailable');
   if(current())setReport(more&&report?{...body.data,rows:[...report.rows,...body.data.rows]}:body.data);
  }catch(error){if(current()){setReport(null);setMessage(error instanceof Error?error.message:'Report unavailable');}}
  finally{if(current())setBusy(false);}
 }
 const columns=report?.rows.length?Object.keys(report.rows[0]):[];
 return <main className="p-6 space-y-4"><h1 className="text-2xl font-semibold">Onboarding record report</h1><p>Review retained checklist records using explicit dates. Checklist creation and item deadlines use different source dates; neither establishes employee joining or workforce membership.</p>
  <form aria-label="Onboarding report filters" onSubmit={event=>{event.preventDefault();void load();}}><fieldset disabled={busy} className="flex flex-wrap gap-3"><label htmlFor="onboarding-report-source">Source</label><select id="onboarding-report-source" required value={source} onChange={event=>setSource(event.target.value)}><option value="">Choose source</option>{Object.entries(names).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><label>From date<input type="date" required min="1000-01-01" max="9999-12-30" value={from} onChange={event=>setFrom(event.target.value)}/></label><label>Through date<input type="date" required min="1000-01-01" max="9999-12-30" value={to} onChange={event=>setTo(event.target.value)}/></label><button className="border p-2">Run onboarding report</button></fieldset></form>
  <p role="status">{message}</p>{report&&<section aria-label="Onboarding report results"><h2>{names[report.source]} · {report.from} through {report.to}</h2><p>{report.basis}</p><p>Generated {report.generatedAt}. Matching records: {report.total}. Loaded rows: {report.rows.length}.</p>{report.globalUndatedItems!==null&&<p>All retained items with no deadline, excluded from the date range: {report.globalUndatedItems}.</p>}<p>{report.context}</p><p>Missing facts on the latest fetched page ({report.pageRowCount} rows): {Object.entries(report.pageMissing).map(([key,value])=>(key==='account'?'account':key==='responsiblePerson'?'responsible person':key)+': '+value).join(' · ')}.</p><p>{report.limitations}</p><div className="overflow-auto"><table><thead><tr>{columns.map(key=><th className="border p-2 text-left" key={key}>{labels[key]||key}</th>)}</tr></thead><tbody>{report.rows.map(row=><tr key={String(row.id)}>{columns.map(key=><td className="border p-2" key={key}>{row[key]===null?'Not recorded':String(row[key])}</td>)}</tr>)}</tbody></table></div>{report.hasMore&&<button disabled={busy} onClick={()=>load(true)}>Load earlier onboarding rows</button>}</section>}
 </main>;
}
