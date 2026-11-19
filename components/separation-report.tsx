"use client";
import {useState,useRef,useEffect} from 'react';
import {getAuthToken} from '@/lib/auth/token';
type Source='reported-resignation'|'ended-episode';
type Row={id:number;employeeId:number;fullName:string;eventDate:string;checklistStatus?:string;plannedLastWorkingDate?:string;episodeStart?:string};
type Report={source:Source;rows:Row[];hasMore:boolean;total:{records:number;people:number};coverage:{sourceRecords:number;undated?:number;otherType?:number;openEpisodes?:number;stillEffectiveOrFutureEnd?:number;voidedEpisodes?:number}};
export function SeparationReport({token}:{token:string}){
 const [source,setSource]=useState<Source>('reported-resignation'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[asOf,setAsOf]=useState(''),[report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),pending=useRef(false),loadedQuery=useRef("");
 useEffect(()=>()=>{generation.current++;pending.current=false},[]);
 function reset(){generation.current++;pending.current=false;loadedQuery.current="";setReport(null);setError("");setBusy(false)}
 async function run(before?:number){
   const q=new URLSearchParams({source,from,to,asOf}),snapshot=q.toString();
   if(pending.current||getAuthToken()!==token||before&&(loadedQuery.current!==snapshot||report?.rows.at(-1)?.id!==before))return;
   pending.current=true;const id=++generation.current;
   const current=()=>generation.current===id&&getAuthToken()===token;
   setBusy(true);setError("");
   try{
     if(before)q.set("before",String(before));
     const base=(process.env.NEXT_PUBLIC_BACKEND_URL||"http://localhost:5005/api/").replace(/\/$/,"");
     const r=await fetch(base+"/employment-records/separation-report?"+q,{headers:{Authorization:"Bearer "+token},cache:"no-store"}),body=await r.json();
     if(!current())return;
     if(!r.ok)throw Error(body.message||"Report unavailable");
     const next=body.data as Report;loadedQuery.current=snapshot;
     setReport(old=>({...next,rows:before&&old?[...old.rows,...next.rows]:next.rows}));
   }catch(e){if(current()){setError((e as Error).message);setReport(null);loadedQuery.current=""}}
   finally{if(current()){pending.current=false;setBusy(false)}}
 }
 return <section className="border p-4 space-y-3"><h2>Resignations and recorded employment ends</h2><form onSubmit={e=>{e.preventDefault();void run()}}><fieldset className="space-y-2" disabled={busy}>
 <label>Separation source<select value={source} onChange={e=>{setSource(e.target.value as Source);reset()}}><option value="reported-resignation">Reported resignations</option><option value="ended-episode">Ended employment episodes</option></select></label>
 <label>Separation dates from<input required type="date" value={from} max={to||undefined} onChange={e=>{setFrom(e.target.value);reset()}}/></label>
 <label>Separation dates through<input required type="date" value={to} min={from||undefined} max={asOf||undefined} onChange={e=>{setTo(e.target.value);reset()}}/></label>
 <label>Separation report as of<input required type="date" value={asOf} min={to||undefined} onChange={e=>{setAsOf(e.target.value);reset()}}/></label>
 <button>Run separation report</button></fieldset></form>{error&&<p role="alert">{error}</p>}{report&&<>
 <p>{report.total.records} matching records · {report.total.people} distinct people</p>
 {report.source==='reported-resignation'?<p>Current offboarding cases record at most one resignation per account. {report.coverage.undated} resignation cases lack a reported date. {report.coverage.otherType} cases have another exit type.</p>:<p>Each employment episode ends after its inclusive recorded end date. Rehires can contribute separate episodes. {report.coverage.openEpisodes} open-ended · {report.coverage.stillEffectiveOrFutureEnd} end on or after the as-of date · {report.coverage.voidedEpisodes} voided.</p>}
 <table><thead><tr><th>Employee</th><th>{report.source==='reported-resignation'?'Resignation reported':'Last day of episode'}</th><th>{report.source==='reported-resignation'?'Planned last working date':'Episode start'}</th></tr></thead><tbody>{report.rows.map(r=><tr key={r.id}><td>{r.fullName} · #{r.employeeId}</td><td>{r.eventDate}</td><td>{r.episodeStart||r.plannedLastWorkingDate||'Unrecorded'}</td></tr>)}</tbody></table>
 {report.hasMore&&<button disabled={busy} onClick={()=>void run(report.rows.at(-1)?.id)}>More separation records</button>}</>}</section>;
}
