'use client';
import {useEffect,useRef,useState} from 'react';import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';import {Button} from '@/components/ui/button';import {Input} from '@/components/ui/input';
import {correctionFetch,hrCommand,savedHRCommand,SavedHRCommand} from '@/lib/correction-api';
type Person={id:number;fullName:string;email:string;role?:string;status?:string;permission?:{active:boolean;version:number}};
type Facts={id:number;userId:number;date:string;status:string;clockIn:string|null;clockOut:string|null;totalHours:number|null};
type Proposal={status:string;clockIn:string|null;clockOut:string|null};
type Audit={id:number;actorId:number;version:number;action:string;reason:string;createdAt:string};
type Draft={id:number;employeeId:number;employee?:Person;workDate:string;attendanceId:number|null;state:string;version:number;baseline:Facts[];proposed:Proposal;appliedRecord?:Facts;events:Audit[];hasEarlierHistory:boolean};
type Page<T>={data:T[];pagination:{currentPage:number;totalPages:number;totalItems:number}};
const problem=(e:unknown)=>e instanceof Error?e.message:'Attendance workflow unavailable';
function SavedProposal({saved}:{saved:SavedHRCommand}){
  const proposal=saved.body.proposed as Partial<Proposal>|undefined;
  return <div><p>Saved recorded date: {String(saved.body.workDate||'Review correction date above')}.</p>{proposal&&<p>Saved proposal: {proposal.status}; clock in {proposal.clockIn||'not recorded'}; clock out {proposal.clockOut||'not recorded'}.</p>}</div>;
}
export default function CorrectionsPage(){const {token,user}=useAuth();return token?<main className="mx-auto max-w-6xl space-y-6 p-6"><Link href={`/${user?.role||'employee'}/dashboard`} className="underline">Back to dashboard</Link><h1 className="text-2xl font-semibold">Attendance corrections</h1><Workspace key={token} token={token}/></main>:<p>Sign in to continue.</p>;}
function Workspace({token}:{token:string}){
  const [access,setAccess]=useState<{canDraft:boolean;canApply:boolean}|null>(null),[error,setError]=useState(''),[mode,setMode]=useState<'review'|'new'|'permissions'>('review'),[selected,setSelected]=useState<number|null>(null),[refresh,setRefresh]=useState(0);
  useEffect(()=>{let alive=true;void correctionFetch<{canDraft:boolean;canApply:boolean}>(token,'correction-access').then(r=>{if(alive)setAccess(r);}).catch(e=>{if(alive)setError(problem(e));});return()=>{alive=false;};},[token]);
  if(error)return <p role="alert">{error}</p>;if(!access)return <p>Loading correction access…</p>;if(!access.canDraft&&!access.canApply)return <p>Attendance correction access is not assigned to this account.</p>;
  return <><p>Propose recorded facts, review the source and retain the reason for every change. Applying requires the dedicated attendance correction permission.</p><div className="flex gap-3"><Button onClick={()=>{setMode('review');setSelected(null);}}>Review corrections</Button>{access.canDraft&&<><Button onClick={()=>{setMode('new');setSelected(null);}}>New correction</Button><Button variant="outline" onClick={()=>setMode('permissions')}>Approval permissions</Button></>}</div>
    {mode==='permissions'?<PermissionManager token={token}/>:mode==='new'?<NewCorrection token={token} onCreated={id=>{setSelected(id);setMode('review');setRefresh(v=>v+1);}}/>:<><Inbox key={refresh} token={token} onSelect={setSelected}/>{selected&&<CorrectionForm key={selected} token={token} draftId={selected} canDraft={access.canDraft} canApply={access.canApply} onSaved={()=>setRefresh(v=>v+1)}/>}</>}
  </>;
}
function Inbox({token,onSelect}:{token:string;onSelect:(id:number)=>void}){
  const [page,setPage]=useState(1),[state,setState]=useState(''),[data,setData]=useState<Page<Draft>|null>(null),[error,setError]=useState('');
  useEffect(()=>{let alive=true;setData(null);void correctionFetch<Page<Draft>>(token,`corrections?page=${page}${state?'&state='+state:''}`).then(r=>{if(alive){setData(r);setError('');}}).catch(e=>{if(alive)setError(problem(e));});return()=>{alive=false;};},[token,page,state]);
  return <section className="space-y-3 rounded border p-4"><h2 className="text-lg font-semibold">Correction inbox</h2><label>State <select value={state} onChange={e=>{setState(e.target.value);setPage(1);}}><option value="">All</option>{['draft','submitted','applied','cancelled'].map(s=><option key={s}>{s}</option>)}</select></label>{error&&<p role="alert">{error}</p>}{data?.data.map(d=><div key={d.id} className="flex justify-between border-b p-2"><span>{d.employee?.fullName} — {d.workDate} — {d.state}</span><Button variant="outline" onClick={()=>onSelect(d.id)}>Review correction {d.id}</Button></div>)}{data&&!data.data.length&&<p>No matching corrections.</p>}<Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button><span> Page {page} of {data?.pagination.totalPages||1} </span><Button disabled={!data||page>=data.pagination.totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button></section>;
}
function AccountSearch({token,onChoose}:{token:string;onChoose:(person:Person)=>void}){
  const [search,setSearch]=useState(''),[page,setPage]=useState(1),[result,setResult]=useState<Page<Person>|null>(null),[error,setError]=useState('');
  useEffect(()=>{let alive=true;setResult(null);const timeout=setTimeout(()=>{void correctionFetch<Page<Person>>(token,`correction-permissions?search=${encodeURIComponent(search)}&page=${page}`).then(r=>{if(alive){setResult(r);setError('');}}).catch(e=>{if(alive)setError(problem(e));});},150);return()=>{alive=false;clearTimeout(timeout);};},[token,search,page]);
  return <div className="space-y-2"><Input aria-label="Find account" placeholder="Find account by name or email" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>{error&&<p role="alert">{error}</p>}<div className="max-h-64 overflow-auto">{result?.data.map(p=><Button key={p.id} variant="outline" className="m-1" onClick={()=>onChoose(p)}>{p.fullName} — {p.email}</Button>)}</div><Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous accounts</Button><Button disabled={!result||page>=result.pagination.totalPages} onClick={()=>setPage(p=>p+1)}>Next accounts</Button></div>;
}
function NewCorrection({token,onCreated}:{token:string;onCreated:(id:number)=>void}){const [person,setPerson]=useState<Person|null>(null);return <section className="space-y-4 rounded border p-4"><h2 className="text-lg font-semibold">Choose employee or account with recorded attendance</h2><AccountSearch token={token} onChoose={setPerson}/>{person&&<CorrectionForm key={person.id} token={token} employee={person} canDraft canApply={false} onSaved={onCreated}/>}</section>;}
function FactsTable({records}:{records:Facts[]}){return <table className="w-full text-left text-sm"><thead><tr><th>Record</th><th>Date</th><th>Stored status</th><th>Clock in</th><th>Clock out</th><th>Recorded hours</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.date}</td><td>{r.status??'Unknown (unrecorded status)'}</td><td>{r.clockIn||'Not recorded'}</td><td>{r.clockOut||'Not recorded'}</td><td>{r.totalHours??'Not recorded'}</td></tr>)}</tbody></table>;}
function CorrectionForm({token,draftId,employee,canDraft,canApply,onSaved}:{token:string;draftId?:number;employee?:Person;canDraft:boolean;canApply:boolean;onSaved:(id:number)=>void}){
  const [draft,setDraft]=useState<Draft|null>(null),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[attendanceId,setAttendanceId]=useState(''),[status,setStatus]=useState(''),[clockIn,setClockIn]=useState(''),[clockOut,setClockOut]=useState(''),[reason,setReason]=useState(''),[source,setSource]=useState<Facts[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState<SavedHRCommand|undefined>(),[loading,setLoading]=useState(!!draftId),[history,setHistory]=useState<Audit[]>([]),[more,setMore]=useState(false);
  const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const target=employee?.id||draft?.employeeId,scope=draftId?'correction:'+draftId:'new-correction:'+employee?.id;
  const populate=(r:Draft)=>{setDraft(r);setDate(r.workDate);setAttendanceId(r.attendanceId?String(r.attendanceId):'');setStatus(r.proposed.status);setClockIn(r.proposed.clockIn||'');setClockOut(r.proposed.clockOut||'');setHistory(r.events);setMore(r.hasEarlierHistory);};
  const refresh=async()=>{if(!draftId)return;const r=await correctionFetch<Draft>(token,'corrections/'+draftId);if(alive.current)populate(r);};
  useEffect(()=>{let current=true;if(draftId)void correctionFetch<Draft>(token,'corrections/'+draftId).then(r=>{if(current)populate(r);}).catch(e=>{if(current)setError(problem(e));}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[token,draftId]);
  useEffect(()=>{let current=true;void savedHRCommand(token,scope).then(p=>{if(current)setPending(p);}).catch(e=>{if(current)setError(problem(e));});return()=>{current=false;};},[token,scope]);
  useEffect(()=>{let current=true;setSource(null);if(target)void correctionFetch<{records:Facts[]}>(token,`corrections/source?employeeId=${target}&date=${date}`).then(r=>{if(current)setSource(r.records);}).catch(e=>{if(current)setError(problem(e));});return()=>{current=false;};},[token,target,date,draft?.version]);
  const send=async(action:string,retry=false)=>{
    if(busy||!target)return;setBusy(true);setError('');
    const body:Record<string,unknown>={action,employeeId:target,expectedVersion:draft?.version||0,reason,...(draft?{correctionId:draft.id}:{})};
    if(['create','edit'].includes(action))Object.assign(body,{workDate:date,attendanceId:attendanceId?Number(attendanceId):null,proposed:{status,clockIn:clockIn||null,clockOut:clockOut||null}});
    try{const r=await hrCommand<Draft>(token,scope,'corrections/commands',body,retry);if(!alive.current)return;setReason('');if(draftId)await refresh();onSaved(r.id);}
    catch(e){if(alive.current)setError(problem(e));}
    finally{if(alive.current){try{setPending(await savedHRCommand(token,scope));}catch(e){setError(problem(e));}setBusy(false);}}
  };
  if(loading)return <p>Loading correction…</p>;
  return <section className="space-y-4 rounded border p-4"><h2 className="text-lg font-semibold">{draft?'Review correction '+draft.id:'Propose correction'} — {employee?.fullName||draft?.employee?.fullName}</h2>{draft&&<p>State: {draft.state}; version {draft.version}</p>}{error&&<p role="alert">{error}</p>}{pending&&<div role="status"><p>Saved change awaiting confirmation: {String(pending.body.action)}. {String(pending.body.reason)}</p><SavedProposal saved={pending}/><Button disabled={busy} onClick={()=>void send(String(pending.body.action),true)}>Retry saved correction change</Button></div>}
    {draftId&&<Button variant="outline" disabled={busy} onClick={()=>void refresh().catch(e=>{if(alive.current)setError(problem(e));})}>Reload correction</Button>}<fieldset disabled={busy||!!pending} className="space-y-3"><label className="block">Recorded date<Input type="date" value={date} disabled={!!draft&&draft.state!=='draft'} onChange={e=>{setDate(e.target.value);setAttendanceId('');setStatus('');setClockIn('');setClockOut('');}}/></label><h3 className="font-semibold">Current source facts</h3>{source?<>{source.length?<FactsTable records={source}/>:<p>No record on this date.</p>}<label className="block">Target record<select aria-label="Target record" className="ml-2 border" value={attendanceId} disabled={!!draft&&draft.state!=='draft'} onChange={e=>{setAttendanceId(e.target.value);const row=source?.find(r=>r.id===Number(e.target.value));setStatus(row?.status||'');setClockIn(row?.clockIn||'');setClockOut(row?.clockOut||'');}}><option value="">{source.length?'Choose an existing record':'Create missing record'}</option>{source.map(r=><option key={r.id} value={r.id}>Record {r.id}: {r.status}</option>)}</select></label></>:<p>Loading source facts…</p>}
    <h3 className="font-semibold">Proposed facts</h3><label className="block">Stored status<select aria-label="Proposed status" className="ml-2 border" value={status} disabled={!!draft&&draft.state!=='draft'} onChange={e=>setStatus(e.target.value)}><option value="">Choose stored status</option>{['present','absent','leave','on-leave','half-day'].map(s=><option key={s}>{s}</option>)}</select></label><label className="block">Clock in (ISO timestamp with timezone; blank if unrecorded)<Input aria-label="Proposed clock in" placeholder="2026-01-01T08:00:00Z" value={clockIn} disabled={!!draft&&draft.state!=='draft'} onChange={e=>setClockIn(e.target.value)}/></label><label className="block">Clock out (ISO timestamp with timezone; blank if unrecorded)<Input aria-label="Proposed clock out" value={clockOut} disabled={!!draft&&draft.state!=='draft'} onChange={e=>setClockOut(e.target.value)}/></label><label className="block">Reason<textarea aria-label="Correction reason" className="block w-full border p-2" maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <div className="flex gap-2">{canDraft&&(!draft||draft.state==='draft')&&<Button disabled={!source||!status||reason.trim().length<3||!!source.length&&!attendanceId} onClick={()=>void send(draft?'edit':'create')}>Save correction draft</Button>}{canDraft&&draft?.state==='draft'&&<Button disabled={reason.trim().length<3} onClick={()=>void send('submit')}>Submit for review</Button>}{canApply&&draft?.state==='submitted'&&<Button disabled={!source||reason.trim().length<3} onClick={()=>void send('apply')}>Apply reviewed correction</Button>}{canDraft&&draft&&['submitted','cancelled'].includes(draft.state)&&<Button disabled={reason.trim().length<3} onClick={()=>void send('reopen')}>Reopen draft</Button>}{canDraft&&draft&&['draft','submitted'].includes(draft.state)&&<Button variant="outline" disabled={reason.trim().length<3} onClick={()=>void send('cancel')}>Cancel correction</Button>}</div></fieldset>
    {draft?.appliedRecord&&<><h3 className="font-semibold">Applied recorded facts</h3><FactsTable records={[draft.appliedRecord]}/></>}{draft&&<><h3 className="font-semibold">Retained source baseline</h3><FactsTable records={draft.baseline}/><h3 className="font-semibold">Attributed history</h3>{history.map(e=><p key={e.id}>Version {e.version} — {e.action} — account {e.actorId} — {e.reason}</p>)}{more&&<Button onClick={async()=>{const cursor=Math.min(...history.map(e=>e.version));try{const r=await correctionFetch<Draft>(token,`corrections/${draft.id}?beforeVersion=${cursor}`);if(alive.current&&r.version===draft.version){setHistory(items=>[...items,...r.events.filter(e=>!items.some(old=>old.id===e.id))]);setMore(r.hasEarlierHistory);}}catch(e){if(alive.current)setError(problem(e));}}}>Earlier correction history</Button>}</>}
  </section>;
}
function PermissionManager({token}:{token:string}){const [person,setPerson]=useState<Person|null>(null);return <section className="space-y-4 rounded border p-4"><h2 className="text-lg font-semibold">Dedicated approval permission</h2><p>Assign attendance correction approval explicitly across accounts. Account roles remain separate; no account receives approval automatically.</p><AccountSearch token={token} onChoose={setPerson}/>{person&&<PermissionCard key={person.id} token={token} person={person}/>}</section>;}
function PermissionCard({ token, person }: { token: string; person: Person }) {
  type PermissionEvent = { id: number; actorId: number; version: number; reason: string; active: boolean };
  const [permission, setPermission] = useState(person.permission || { active: false, version: 0 });
  const [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<SavedHRCommand | undefined>();
  const [events, setEvents] = useState<PermissionEvent[]>([]), [moreHistory, setMoreHistory] = useState(false);
  const alive = useRef(true), scope = 'correction-permission:' + person.id;
  useEffect(() => {
    alive.current = true;
    void savedHRCommand(token, scope).then(p => { if (alive.current) setPending(p); }).catch(e => { if (alive.current) setError(problem(e)); });
    return () => { alive.current = false; };
  }, [token, scope]);
  const reload = async () => {
    const result = await correctionFetch<Page<Person>>(token, 'correction-permissions?search=' + encodeURIComponent(person.email));
    const current = result.data.find(p => p.id === person.id);
    if (alive.current && current?.permission) setPermission(current.permission);
  };
  const send = async (retry = false) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await hrCommand<{ active: boolean; version: number }>(token, scope, 'correction-permissions/commands',
        { userId: person.id, expectedVersion: permission.version, active: !permission.active, reason }, retry);
      if (alive.current) {
        setPermission(result); setReason('');
        try { await reload(); } catch (_) { setError('Permission change confirmed. Reload the current permission status.'); }
      }
    } catch (e) { if (alive.current) setError(problem(e)); }
    finally {
      if (alive.current) {
        try { setPending(await savedHRCommand(token, scope)); } catch (e) { setError(problem(e)); }
        setBusy(false);
      }
    }
  };
  const history = async (earlier = false) => {
    const cursor = earlier ? Math.min(...events.map(e => e.version)) : null;
    try {
      const result = await correctionFetch<{ events: PermissionEvent[]; hasEarlierHistory: boolean }>(token,
        'correction-permissions/' + person.id + '/history' + (cursor ? '?beforeVersion=' + cursor : ''));
      if (alive.current) {
        setEvents(items => earlier ? [...items, ...result.events.filter(e => !items.some(old => old.id === e.id))] : result.events);
        setMoreHistory(result.hasEarlierHistory);
      }
    } catch (e) { if (alive.current) setError(problem(e)); }
  };
  return <div className="space-y-3">
    <h3>{person.fullName} — {person.email}</h3>
    <p>Approval permission: {permission.active ? 'Granted' : 'Not granted'}. Version {permission.version}.</p>
    {error && <p role="alert">{error}</p>}
    {pending && <Button disabled={busy} onClick={() => void send(true)}>Retry saved permission change</Button>}
    <label>Permission reason<Input aria-label="Permission reason" maxLength={500} value={reason} disabled={busy || !!pending} onChange={e => setReason(e.target.value)} /></label>
    <Button disabled={busy || !!pending || reason.trim().length < 3} onClick={() => void send()}>{permission.active ? 'Revoke approval permission' : 'Grant approval permission'}</Button>
    <Button variant="outline" disabled={busy} onClick={() => void reload().catch(e => setError(problem(e)))}>Reload permission</Button>
    <Button variant="outline" onClick={() => void history()}>Permission history</Button>
    {events.map(e => <p key={e.id}>Version {e.version}: {e.active ? 'granted' : 'revoked'} by account {e.actorId} — {e.reason}</p>)}
    {moreHistory && <Button variant="outline" onClick={() => void history(true)}>Earlier permission history</Button>}
  </div>;
}
