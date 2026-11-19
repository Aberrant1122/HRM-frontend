"use client";
import {useEffect,useState} from 'react';
import {getAuthToken} from '@/lib/auth/token';
import {Task} from '@/lib/hr-task-api';
type DeadlineEvent={version:number;submissionDueDate:string|null;approvalDueDate:string|null;actorId:number;reason:string};
type Result={taskVersion:number;version:number;submissionDueDate:string|null;approvalDueDate:string|null;rows:DeadlineEvent[];hasMore:boolean};
type Command={taskVersion:number;expectedVersion:number;submissionDueDate:string|null;approvalDueDate:string|null;reason:string;commandKey:string};
export function datesText(t:Pick<Task,'dueDate'|'submissionDueDate'|'approvalDueDate'>){
 return 'Submission '+(t.submissionDueDate || 'undated')+' · Approval '+(t.approvalDueDate || 'undated')+(t.dueDate?' · Legacy unclassified '+t.dueDate:'');
}
export function TaskStageEditor({task,refresh}:{task:Task;refresh:()=>void}){
 const token=getAuthToken() || '',path=(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/,'')+'/hr-tasks/'+task.id+'/deadlines',store='task-stage:'+path+':'+(token.split('.')[1] || '');
 const [data,setData]=useState<Result|null>(null),[sub,setSub]=useState(''),[approval,setApproval]=useState(''),[reason,setReason]=useState(''),[pending,setPending]=useState<Command|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[revision,setRevision]=useState(0);
 async function request(suffix:string,body?:Command){const r=await fetch(path+suffix,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',...(body&&{body:JSON.stringify(body)})});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.message || 'Stage deadlines unavailable'),{status:r.status});return d.data;}
 useEffect(()=>{let active=true;try{const saved=sessionStorage.getItem(store);if(saved)setPending(JSON.parse(saved));}catch{setMessage('Retry storage unavailable');return;}
 request('').then((d:Result)=>{if(active){setData(d);setSub(d.submissionDueDate || '');setApproval(d.approvalDueDate || '');}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[token,store,revision,task.version,task.deadlineVersion]);
 async function save(body:Command){setBusy(true);try{sessionStorage.setItem(store,JSON.stringify(body));setPending(body);await request('',body);sessionStorage.removeItem(store);setPending(null);setReason('');setMessage('Stage deadlines saved');setRevision(n=>n+1);refresh();}
 catch(e){const err=e as Error & {status?:number};setMessage(err.message);if([400,403,404,409].includes(err.status||0)){sessionStorage.removeItem(store);setPending(null);}}finally{setBusy(false);}}
 async function older(){if(!data)return;setBusy(true);try{const next:Result=await request('?before='+data.rows[data.rows.length-1].version);setData({...data,rows:[...data.rows,...next.rows],hasMore:next.hasMore});}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section aria-label="Stage deadlines" className="border p-3"><h3>Stage deadlines</h3>{message&&<p role="status">{message}</p>}{pending&&<button disabled={busy} onClick={()=>save(pending)}>Retry unconfirmed stage dates</button>}
 {['open','in_progress','pending_approval'].includes(task.status)&&<form onSubmit={e=>{e.preventDefault();if(data)void save({taskVersion:data.taskVersion,expectedVersion:data.version,submissionDueDate:sub||null,approvalDueDate:approval||null,reason,commandKey:crypto.randomUUID()});}}>
 <fieldset disabled={!data||busy||!!pending}><label>Submission deadline <input type="date" value={sub} onChange={e=>setSub(e.target.value)}/></label>
 <label>Approval deadline <input type="date" value={approval} onChange={e=>setApproval(e.target.value)}/></label><label>Reason for stage dates <input required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><button>Save stage deadlines</button></fieldset></form>}
 {data?.rows.map(r=><p key={r.version}>{r.reason} · {datesText({...r,dueDate:null})} · Account {r.actorId}</p>)}{data?.hasMore&&<button disabled={busy} onClick={older}>Earlier deadline changes</button>}<button disabled={busy} onClick={()=>setRevision(n=>n+1)}>Reload stage dates</button></section>;
}
