"use client";
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/auth/token';
import { compensationGet, compensationSave, pendingCompensation, Snapshot, Saved } from '@/lib/compensation-api';

export default function SalaryRevisions(){
  const id=String(useParams().id),scope=useRef(0),[data,setData]=useState<Snapshot|null>(null),[pending,setPending]=useState<Saved>(),[amount,setAmount]=useState(''),[basis,setBasis]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{
    const generation=++scope.current,token=getAuthToken();setData(null);setPending(undefined);setBusy(true);setMessage('');
    const current=()=>scope.current===generation&&getAuthToken()===token;
    if(!token){setMessage('Sign in to continue');setBusy(false);return;}
    Promise.all([compensationGet<Snapshot>(token,`profile/${id}/revisions`),pendingCompensation(token,id)]).then(([snapshot,saved])=>{if(!current())return;setData(snapshot);setAmount(snapshot.profile.base_salary);setBasis(snapshot.profile.salary_type);setPending(saved);}).catch(e=>{if(current())setMessage(e.message);}).finally(()=>{if(current())setBusy(false);});
    const changed=()=>{if(getAuthToken()!==token){++scope.current;setData(null);setPending(undefined);setMessage('Account changed. Reload this page.');setBusy(false);}};
    window.addEventListener('storage',changed);return()=>{++scope.current;window.removeEventListener('storage',changed);};
  },[id]);
  async function save(retry=false){
    if(!data)return;const generation=scope.current,token=getAuthToken();if(!token)return;const current=()=>scope.current===generation&&getAuthToken()===token;
    setBusy(true);setMessage('');
    try{const result=await compensationSave(token,id,retry?undefined:{expectedRevision:data.profile.salary_revision,baseAmount:amount,salaryType:basis,reason},retry);if(!current())return;setData(result.data);setAmount(result.data.profile.base_salary);setBasis(result.data.profile.salary_type);setReason('');setMessage(`Salary revision ${result.appliedRevision} retained${result.replayed?' (replayed)':''}. Current revision: ${result.data.profile.salary_revision}. Issued payroll was not recalculated.`);}
    catch(e){if(current())setMessage(e instanceof Error?e.message:'Salary revision unavailable');}
    finally{try{const saved=await pendingCompensation(token,id);if(current())setPending(saved);}catch{if(current())setMessage('Retry storage unavailable. Reload before continuing.');}if(current())setBusy(false);}
  }
  async function earlier(){
    if(!data||!data.history.length)return;const generation=scope.current,token=getAuthToken();if(!token)return;const current=()=>scope.current===generation&&getAuthToken()===token;setBusy(true);
    try{const older=await compensationGet<Snapshot>(token,`profile/${id}/revisions?before=${data.history[data.history.length-1].revision}`);if(current())setData({...data,history:[...data.history,...older.history],hasEarlierHistory:older.hasEarlierHistory});}catch(e){if(current())setMessage(e instanceof Error?e.message:'History unavailable');}finally{if(current())setBusy(false);}
  }
  return <main className="p-6 max-w-3xl space-y-5">
    <Link className="underline" href="/admin/payroll/profiles">Payroll profiles</Link>
    <h1 className="text-2xl font-semibold">Salary history and revision</h1>
    <p role="status">{message||(!data?'Loading salary profile…':'')}</p>
    {data&&<>
      <p>{data.employee.fullName} — {data.employee.email}</p>
      <p>Current base amount: {data.profile.base_salary} / {data.profile.salary_type}. Revision {data.profile.salary_revision}.</p>
      <p>Legacy employee profile salary: {data.legacy?.salary??'Not recorded'}. This is a separate field and is not synchronized by revisions.</p>
      <p>Changes apply when saved. Existing payroll records remain unchanged. Currency, future effective dates and calculation policies require separate decisions.</p>
      {pending&&<section className="border p-4 space-y-2"><h2 className="font-semibold">Retained change awaiting resolution</h2><p>Amount: {String(pending.body.baseAmount)} / {String(pending.body.salaryType)}</p><p>Reason: {String(pending.body.reason)}</p><button className="underline" disabled={busy} onClick={()=>save(true)}>Retry retained change</button></section>}
      <form className="space-y-3" onSubmit={e=>{e.preventDefault();void save();}}>
        <fieldset disabled={busy||!!pending} className="space-y-3">
          <label className="block">Base amount<input className="block border p-2" name="baseAmount" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} pattern="[0-9]{1,10}(\.[0-9]{1,2})?" required /></label>
          <label className="block">Salary basis<select className="block border p-2" value={basis} onChange={e=>setBasis(e.target.value)} required><option value="monthly">Monthly</option><option value="hourly">Hourly</option><option value="daily">Daily</option></select></label>
          <label className="block">Reason<textarea className="block border p-2 w-full" value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} required /></label>
          <p>Proposed: {data.profile.base_salary} / {data.profile.salary_type} → {amount} / {basis}</p>
          <button className="border rounded p-2" type="submit">Save salary revision</button>
        </fieldset>
      </form>
      <h2 className="text-xl font-semibold">Retained revisions</h2>
      {!data.history.length&&<p>No retained revisions yet. Earlier changes were not backfilled.</p>}
      {data.history.map(event=><article className="border p-3 space-y-1" key={event.id}><h3>Revision {event.revision}</h3><p>{event.details.before.base_salary} / {event.details.before.salary_type} → {event.details.after.base_salary} / {event.details.after.salary_type}</p><p>{event.details.actor.fullName} — {event.createdAt}</p><p className="whitespace-pre-wrap">{event.details.reason}</p></article>)}
      {data.hasEarlierHistory&&<button className="underline" disabled={busy} onClick={earlier}>Earlier revisions</button>}
    </>}
  </main>;
}
