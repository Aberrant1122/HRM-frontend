"use client";
import {FormEvent,useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {getAuthToken} from '@/lib/auth/token';

type Input = {kind:string; amount:string; currency:string; reference:string; commandKey:string};
type Entry = Omit<Input,'commandKey'> & {id:number;actorId:number;createdAt:string};
type Page = {rows:Entry[];employeeId:number;period:string;writable:boolean;hasMore:boolean};
const base=(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/,'');
export default function PayrollComponents() {
  const {id}=useParams<{id:string}>();
  return <Ledger key={id} id={id}/>;
}
function Ledger({id}:{id:string}) {
  const token=getAuthToken() || '', endpoint=base+'/payroll/components/'+id;
  const storage='payroll-component:'+endpoint+':'+(token.split('.')[1] || '');
  const [page,setPage]=useState<Page|null>(null),[pending,setPending]=useState<Input|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[serial,setSerial]=useState(0);
  async function request(path:string,body?:Input) {
    const res=await fetch(endpoint+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)})});
    const data=await res.json();if(!res.ok)throw Object.assign(Error(data.message || 'Payroll components unavailable'),{status:res.status});return data;
  }
  useEffect(()=>{
    let active=true;
    try{const stored=sessionStorage.getItem(storage);if(stored)setPending(JSON.parse(stored));}
    catch {setMessage('Retry storage unavailable');return;}
    request('').then(data=>{if(active)setPage(data);}).catch(e=>{if(active)setMessage(e.message);});
    return()=>{active=false;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[serial,storage,token]);
  async function save(body:Input) {
    if(busy)return;setBusy(true);
    try {
      sessionStorage.setItem(storage,JSON.stringify(body));setPending(body);await request('',body);
      sessionStorage.removeItem(storage);setPending(null);setMessage('Component recorded');setSerial(n=>n+1);
    }catch(e){const err=e as Error & {status?:number};setMessage(err.message);if([400,403,404,409].includes(err.status || 0)){sessionStorage.removeItem(storage);setPending(null);}}
    finally{setBusy(false);}
  }
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const fields=new FormData(e.currentTarget);
    void save({kind:String(fields.get('kind')),amount:String(fields.get('amount')),currency:String(fields.get('currency')).toUpperCase(),reference:String(fields.get('reference')),commandKey:crypto.randomUUID()});
  }
  async function older(){if(!page)return;setBusy(true);try{const more:Page=await request('?before='+page.rows[page.rows.length-1].id);setPage({...more,rows:[...page.rows,...more.rows]});}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  return <main className="max-w-3xl p-6 space-y-4"><h1 className="text-2xl font-semibold">Payroll component records</h1>
    {page&&<p>{page.period} · Employee #{page.employeeId} · Payroll row #{id}</p>}
    <p>These entries document amounts for payroll review. Recording an entry keeps the calculated gross pay, deductions and net pay at their current values.</p>
    {message&&<p role="status">{message}</p>}
    {pending&&<button disabled={busy} onClick={()=>save(pending)}>Retry unconfirmed component</button>}
    {page?.writable&&<form key={serial} onSubmit={submit}><fieldset className="border p-4 grid gap-3" disabled={busy || !!pending}><legend>Record component</legend>
    <label>Component <select name="kind"><option value="commission">Commission</option><option value="bonus">Bonus</option><option value="allowance">Allowance</option><option value="deduction">Deduction</option></select></label>
    <label>Amount <input name="amount" inputMode="decimal" required/></label><label>Currency <input name="currency" value="PKR" readOnly/></label>
    <label>Source reference or reason <input name="reference" required maxLength={240}/></label><button>Record component</button></fieldset></form>}
    {page && !page.writable && <p>Finalized payroll is read-only.</p>}
    {page?.rows.map(r=><article className="border rounded p-3" key={r.id}><h2 className="capitalize">{r.kind}</h2><p>{r.currency} {r.amount} · {r.reference}</p><p>Recorded by account {r.actorId} · {r.createdAt}</p></article>)}
    {page?.hasMore&&<button disabled={busy} onClick={older}>Load earlier components</button>}
    <button disabled={busy} onClick={()=>setSerial(n=>n+1)}>Reload component records</button>
  </main>;
}
