"use client";
import {useEffect,useRef,useState} from 'react';
import {getAuthToken} from '@/lib/auth/token';
type Result={opening:number;closing:number;days:number;personDays:number;averageHeadcount:number;endedEpisodes:number;endedPeople:number;numeratorCount:number;percentage:number|null;excludedVoided:number;invalidEpisodes:number;coverage:{accountsWithoutValidEpisode:number}};
export function EmploymentEndMeasure({token}:{token:string}){
 const [source,setSource]=useState(''),[numerator,setNumerator]=useState(''),[denominator,setDenominator]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[asOf,setAsOf]=useState(''),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0),pending=useRef(false);
 useEffect(()=>()=>{generation.current++},[]);
 function clear(){generation.current++;pending.current=false;setResult(null);setError('');setBusy(false)}
 async function run(){if(pending.current)return;pending.current=true;const n=++generation.current,current=()=>generation.current===n&&getAuthToken()===token;setBusy(true);setResult(null);setError('');try{
 const base=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,'');
 const response=await fetch(base+'/employment-records/end-statistics?'+new URLSearchParams({source,numerator,denominator,from,to,asOf}),{headers:{Authorization:'Bearer '+token},cache:'no-store'}),body=await response.json();
 if(!current())return;if(!response.ok)throw Error(body.message||'Measure unavailable');setResult(body.data);
 }catch(e){if(current())setError((e as Error).message)}finally{if(current()){pending.current=false;setBusy(false)}}}
 return <section className="border p-4 space-y-3"><h2>Employment-end statistics</h2><p>Choose the measure for this report. Every qualifying end is counted regardless of reason. Headcount uses recorded nonvoid employment episodes across all account roles. End dates are inclusive.</p>
 <form onSubmit={e=>{e.preventDefault();void run()}}><fieldset disabled={busy} className="space-y-2">
 <label>Statistics source<select required value={source} onChange={e=>{setSource(e.target.value);clear()}}><option value="">Select source</option><option value="recorded-employment-ends">All recorded employment ends</option></select></label>
 <label>Statistics numerator<select required value={numerator} onChange={e=>{setNumerator(e.target.value);clear()}}><option value="">Select numerator</option><option value="distinct-people">Distinct people with an ended episode</option><option value="episodes">Ended episodes, including rehires</option></select></label>
 <label>Headcount denominator<select required value={denominator} onChange={e=>{setDenominator(e.target.value);clear()}}><option value="">Select denominator</option><option value="daily-mean">Average daily headcount</option><option value="opening-closing-mean">Mean opening and closing headcount</option></select></label>
 <label>Statistics from<input required type="date" value={from} onChange={e=>{setFrom(e.target.value);clear()}}/></label>
 <label>Statistics through<input required type="date" value={to} onChange={e=>{setTo(e.target.value);clear()}}/></label>
 <label>Statistics as of<input required type="date" value={asOf} onChange={e=>{setAsOf(e.target.value);clear()}}/></label>
 <button>Calculate selected measure</button></fieldset></form>{error&&<p role="alert">{error}</p>}{result&&<div aria-label="Employment-end statistics result">
 <p>{result.percentage===null?'Unavailable because average headcount is zero':result.percentage+'%'} · selected employment-end measure</p>
 <p>{result.numeratorCount} numerator · {result.averageHeadcount} average headcount · {result.opening} opening · {result.closing} closing</p>
 <p>{result.endedEpisodes} ended episodes · {result.endedPeople} distinct people · {result.personDays} person-days over {result.days} calendar days</p>
 <p>{result.coverage.accountsWithoutValidEpisode} accounts without a valid employment episode · {result.excludedVoided} voided episodes · {result.invalidEpisodes} invalid episodes excluded</p>
 </div>}</section>;
}
