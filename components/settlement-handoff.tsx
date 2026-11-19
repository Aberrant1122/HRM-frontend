"use client";
import {useEffect,useState} from 'react';
import {getAuthToken} from '@/lib/auth/token';
import {OrganizationChoice} from '@/components/organization-choice';
const base=(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/,'')+'/offboarding/';
type Event={id:number;sequence:number;action:string;actorName:string;recipientName:string;recipientId:number;caseVersion:number;clearanceStatus:string;pendingItems:number;note:string};
type Detail={sequence:number;caseVersion:number;canReceive:boolean;rows:Event[];hasMore:boolean};
type Command={action:string;recipientId:number;note:string;caseVersion:number;expectedSequence:number;commandKey:string};
async function request<T>(token:string,path:string,body?:Command):Promise<T>{
 const res=await fetch(base+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)})});
 const data=await res.json();if(!res.ok)throw Object.assign(Error(data.message || 'Settlement handoff unavailable'),{status:res.status});return data;
}
export function SettlementCase({employee}:{employee:string}){
 const token=getAuthToken() || '',path='employee/'+employee+'/settlement',storage='settlement-handoff:'+base+path+':'+(token.split('.')[1] || '');
 const [detail,setDetail]=useState<Detail|null>(null),[recipient,setRecipient]=useState(''),[note,setNote]=useState(''),[pending,setPending]=useState<Command|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;try{const saved=sessionStorage.getItem(storage);if(saved)setPending(JSON.parse(saved));}catch{setMessage('Retry storage unavailable');return;}
 request<Detail>(token,path).then(d=>{if(active)setDetail(d);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[token,path,storage,revision]);
 async function save(body:Command){
  if(busy)return;setBusy(true);try{sessionStorage.setItem(storage,JSON.stringify(body));setPending(body);await request(token,path,body);sessionStorage.removeItem(storage);setPending(null);setNote('');setMessage('Handoff recorded');setRevision(n=>n+1);}
  catch(e){const err=e as Error & {status?:number};setMessage(err.message);if([400,403,404,409].includes(err.status || 0)){sessionStorage.removeItem(storage);setPending(null);}}
  finally{setBusy(false);}
 }
 function send(action:string){
  if(!detail || !note.trim())return;
  const recipientId=action==='receive'?detail.rows[0]?.recipientId:Number(recipient);
  void save({action,recipientId,note,expectedSequence:detail.sequence,caseVersion:detail.caseVersion,commandKey:crypto.randomUUID()});
 }
 async function earlier(){if(!detail)return;setBusy(true);try{const older=await request<Detail>(token,path+'?before='+detail.rows[detail.rows.length-1].sequence);setDetail({...detail,rows:[...detail.rows,...older.rows],hasMore:older.hasMore});}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section aria-label="Final settlement handoff" className="border rounded p-4 space-y-3"><h2>Final settlement handoff</h2><a className="underline" href={"/admin/payroll/settlements/"+employee}>Final settlement draft</a><p>Send this employee’s clearance status to the payroll administrator coordinating final settlement.</p>
 {message&&<p role="status">{message}</p>}{pending&&<button disabled={busy} onClick={()=>save(pending)}>Retry unconfirmed handoff</button>}
 <fieldset disabled={!detail || busy || !!pending}><OrganizationChoice kind="accounts" value={recipient} onChange={setRecipient} selected={recipient} labelOverride="Payroll administrator"/>
 <label>Handoff or receipt note <input value={note} maxLength={500} onChange={e=>setNote(e.target.value)}/></label>
 <button type="button" disabled={!recipient || !note.trim()} onClick={()=>send('assign')}>Send settlement handoff</button>
 {detail?.canReceive&&<button type="button" disabled={!note.trim()} onClick={()=>send('receive')}>Acknowledge receipt</button>}</fieldset>
 {detail?.rows.map(r=><article key={r.id} className="border-t py-2"><h3>{r.action==='assign'?'Assigned to '+r.recipientName:'Received by '+r.recipientName}</h3><p>{r.note} · Recorded by {r.actorName}</p><p>Clearance {r.clearanceStatus} at version {r.caseVersion} · Pending items {r.pendingItems}</p></article>)}
 {detail?.hasMore&&<button disabled={busy} onClick={earlier}>Earlier handoffs</button>}<button disabled={busy} onClick={()=>setRevision(n=>n+1)}>Reload settlement handoff</button></section>;
}
type InboxRow={id:number;employeeId:number;fullName:string;note:string};
type Inbox={rows:InboxRow[];hasMore:boolean};
export function SettlementInbox(){
 const token=getAuthToken() || '',[page,setPage]=useState<Inbox>({rows:[],hasMore:false}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;request<Inbox>(token,'settlement/inbox').then(d=>{if(active){setPage(d);setLoaded(true);setError('');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[token,retry]);
 async function more(){setBusy(true);try{const d=await request<Inbox>(token,'settlement/inbox?before='+page.rows[page.rows.length-1].id);setPage({...d,rows:[...page.rows,...d.rows]});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <main className="max-w-3xl p-6 space-y-4"><h1>My settlement handoffs</h1>{error&&<p role="alert">{error}</p>}{loaded&&!page.rows.length&&<p>No settlement handoffs awaiting receipt.</p>}
 {page.rows.map(r=><article key={r.id}><a className="underline" href={'/admin/employees/'+r.employeeId+'/offboarding'}>{r.fullName}</a><p>{r.note}</p></article>)}
 {page.hasMore&&<button disabled={busy} onClick={more}>Load earlier handoffs</button>}<button disabled={busy} onClick={()=>setRetry(n=>n+1)}>Reload inbox</button></main>;
}
