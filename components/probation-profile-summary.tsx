"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {getAuthToken} from '@/lib/auth/token';
import {probationGet,type Snapshot} from '@/lib/probation-api';
export function ProbationProfileSummary({employeeId}:{employeeId:string}){
 const {user}=useAuth(),token=getAuthToken()||'',owner=String(user?.id)+':'+user?.role+':'+token+':'+employeeId,[record,setRecord]=useState<{owner:string;data:Snapshot}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),seq=useRef(0);
 useEffect(()=>{const n=++seq.current;setRecord(null);setError('');if(user?.role==='admin'&&token)void probationGet<Snapshot>(token,'employee/'+employeeId).then(data=>{if(seq.current===n&&getAuthToken()===token)setRecord({owner,data});}).catch(e=>{if(seq.current===n&&getAuthToken()===token)setError(e instanceof Error?e.message:'Current probation record unavailable');});return()=>{seq.current++;};},[employeeId,owner,retry,token,user?.role]);
 if(user?.role!=='admin')return null;const data=record?.owner===owner?record.data:null,p=data?.probation;
 return <section aria-label="Current probation record" className="border rounded p-4 m-4 space-y-2"><h2 className="text-xl font-semibold">Current recorded probation state</h2><p>This is the explicit probation case. Service dates, employment labels, account access and pay use their own records.</p>{error?<p role="alert">{error}</p>:!data?<p>Loading current probation record…</p>:p?<><p>Recorded case status: {p.status}</p><p>Case #{p.id} · version {p.version} · {p.startDate} through {p.endDate}</p><p>Evaluation: {p.evaluationDate||'Unscheduled'} · Decision date: {p.decisionDate||'Unrecorded'}</p></>:<p>No explicit probation record. Legacy profile dates have not been adopted.</p>}<div className="flex gap-4"><button className="underline" onClick={()=>setRetry(n=>n+1)}>Refresh current probation record</button><Link className="underline" href={'/admin/employees/'+employeeId+'/probation'}>Open probation record and history</Link></div></section>;
}
