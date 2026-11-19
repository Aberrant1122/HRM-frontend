"use client";
import { FormEvent, useEffect, useState } from "react";
import { OrganizationChoice } from "@/components/organization-choice";
import { getAuthToken } from "@/lib/auth/token";
type Repayment = { id:number; amount:string; effectiveDate:string; reference:string; actorId:number };
type Entry = Repayment & { kind:string; currency:string; balance:string; repayments:Repayment[] };
type Page = { rows:Entry[]; hasMore:boolean; mayIssue:boolean };
type Command = { commandKey:string; kind:string; amount:string; currency:string; accountId:number|null; effectiveDate:string; reference:string };
const initial = {rows:[],hasMore:false,mayIssue:false};
const base = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/,'');
async function payrollAccounts(token:string,search:string) {
  const response=await fetch(base+'/payroll/advances/options?search='+encodeURIComponent(search),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  const result=await response.json();if(!response.ok)throw Error(result.message || 'Employee search unavailable');return result.data;
}
export default function Advances() {
  const [employee,setEmployee] = useState('');
  return <main className="max-w-3xl p-6 space-y-4"><h1 className="text-2xl font-semibold">Salary advances and loans</h1>
    <OrganizationChoice kind="accounts" findAccounts={payrollAccounts} value={employee} onChange={setEmployee} selected={employee} labelOverride="Employee"/>
    {employee && <Ledger key={employee} employee={employee}/>}</main>;
}
function Ledger({employee}:{employee:string}) {
  const [page,setPage]=useState<Page>(initial),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [original,setOriginal]=useState<Entry|null>(null),[pending,setPending]=useState<Command|null>(null),[serial,setSerial]=useState(0);
  const token=getAuthToken() || '', endpoint=base+'/payroll/advances/'+employee;
  const storage='advance-ledger:'+base+':'+(token.split('.')[1] || '')+':'+employee;
  async function request(path:string, body?:Command) {
    const res=await fetch(endpoint+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',...(body && {body:JSON.stringify(body)})});
    const result=await res.json(); if(!res.ok)throw Object.assign(new Error(result.message || 'Ledger unavailable'),{status:res.status}); return result;
  }
  useEffect(()=>{
    let active=true;
    try { const saved=sessionStorage.getItem(storage); if(saved)setPending(JSON.parse(saved)); }
    catch {setMessage('Retry storage unavailable');return;}
    request('').then(data=>{if(active){setPage(data);setReady(true);}}).catch(e=>{if(active)setMessage(e.message);});
    return ()=>{active=false;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[employee,token,serial]);
  async function save(body:Command) {
    if(busy || !ready)return;
    setBusy(true);
    try {
      sessionStorage.setItem(storage, JSON.stringify(body));setPending(body);
      await request('',body);sessionStorage.removeItem(storage);setPending(null);setOriginal(null);setMessage('Entry recorded');setSerial(n=>n+1);
    } catch(e) {
      const err=e as Error & {status?:number};setMessage(err.message);
      if([400,403,404,409].includes(err.status || 0)){sessionStorage.removeItem(storage);setPending(null);}
    } finally {setBusy(false);}
  }
  function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data=new FormData(e.currentTarget);
    void save({commandKey:crypto.randomUUID(),kind:original?'repayment':String(data.get('kind')),accountId:original?.id || null,
      amount:String(data.get('amount')),currency:original?.currency || String(data.get('currency')).toUpperCase(),effectiveDate:String(data.get('date')),reference:String(data.get('reference'))});
  }
  async function older() {
    setBusy(true);try{const more:Page=await request('?before='+page.rows[page.rows.length-1].id);setPage({...more,rows:[...page.rows,...more.rows]});}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="space-y-4">{message&&<p role="status">{message}</p>}
    {pending && <button disabled={busy || !ready} onClick={()=>save(pending)}>Retry unconfirmed entry</button>}
    {(page.mayIssue || original) && <form key={String(original?.id)+':'+serial} onSubmit={submit}><fieldset disabled={!ready || busy || !!pending} className="border rounded p-4 grid gap-3">
      <legend>{original?'Repayment for '+original.kind+' #'+original.id:'Record an advance or loan'}</legend>
      {!original && <label>Entry type <select name="kind"><option value="advance">Salary advance</option><option value="loan">Loan</option></select></label>}
      <label>Amount <input name="amount" inputMode="decimal" required pattern="(0|[1-9][0-9]{0,11})(\.[0-9]{1,4})?" /></label>
      <label>Currency <input name="currency" required maxLength={3} pattern="[A-Za-z]{3}" value={original?.currency || 'PKR'} readOnly/></label>
      <label>Effective date <input name="date" type="date" required min={original?.effectiveDate}/></label>
      <label>Reference or reason <input name="reference" required maxLength={240}/></label>
      <button>Record {original?'repayment':'entry'}</button>{original&&<button type="button" onClick={()=>setOriginal(null)}>Cancel repayment</button>}
    </fieldset></form>}
    {page.rows.map(row=><article key={row.id} className="border rounded p-4"><h2>{row.kind==='loan'?'Loan':'Salary advance'} #{row.id}</h2>
      <p>{row.reference} · Issued {row.effectiveDate} · Recorded by account {row.actorId}</p>
      <p>Principal {row.currency} {row.amount} · Outstanding {row.currency} {row.balance}</p>
      {row.repayments.map(r=><p key={r.id}>Repayment {r.effectiveDate} · {row.currency} {r.amount} · {r.reference} · Recorded by account {r.actorId}</p>)}
      {Number(row.balance)>0 && <button disabled={busy || !!pending} onClick={()=>setOriginal(row)}>Record repayment for #{row.id}</button>}</article>)}
    {page.hasMore&&<button disabled={busy} onClick={older}>Load earlier entries</button>}
    {!ready && !busy && <button onClick={()=>setSerial(n=>n+1)}>Reload ledger</button>}
  </section>;
}
