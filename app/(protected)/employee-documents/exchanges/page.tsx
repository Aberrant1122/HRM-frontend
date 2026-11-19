"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {getAuthToken} from "@/lib/auth/token";
import {employeeDocumentGet,employeeDocumentSave,pendingEmployeeDocument} from "@/lib/employee-document-api";
import Link from "next/link";

type Exchange={id:string;employeeName:string;title:string;direction:string;dueDate:string|null;resolution:string|null;note:string|null};
type Person={id:number;fullName:string;email:string};
const commands="exchanges/commands";
export default function Exchanges(){
  const [status,setStatus]=useState("pending"),[page,setPage]=useState(1),[rows,setRows]=useState<Exchange[]>([]),[total,setTotal]=useState(0);
  const [term,setTerm]=useState(""),[people,setPeople]=useState<Person[]>([]),[employee,setEmployee]=useState("");
  const [title,setTitle]=useState(""),[direction,setDirection]=useState("send"),[due,setDue]=useState(""),[note,setNote]=useState("");
  const [selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[pending,setPending]=useState(false);
  const token=getAuthToken(),view=JSON.stringify([token,status,page]),currentView=useRef(view),generation=useRef(0);
  currentView.current=view;
  const load=useCallback(async()=>{
    const request=++generation.current,isCurrent=()=>generation.current===request&&currentView.current===view&&getAuthToken()===token;
    setRows([]);setTotal(0);setPending(false);setSelected("");setNote("");setError("");
    try{
      if(!token)throw Error("Sign in to view document exchanges");
      const [data,retained]=await Promise.all([employeeDocumentGet<{rows:Exchange[];total:number}>(token,"exchanges?status="+status+"&page="+page),pendingEmployeeDocument(token,commands)]);
      if(isCurrent()){setRows(data.rows);setTotal(data.total);setPending(!!retained);}
    }catch(e){if(isCurrent())setError((e as Error).message);}
  },[token,status,page,view]);
  const latestLoad=useRef(load);latestLoad.current=load;
  useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
  async function write(body?:Record<string,unknown>){
    const token=getAuthToken();if(!token||busy)return;
    setBusy(true);setError("");
    try{await employeeDocumentSave(token,commands,body,!body);if(getAuthToken()===token){setTitle("");setSelected("");setNote("");}}
    catch(e){if(getAuthToken()===token&&currentView.current===view)setError((e as Error).message);}
    finally{await latestLoad.current();setBusy(false);}
  }
  async function search(){
    const token=getAuthToken();if(!token)return;
    try{setPeople(await employeeDocumentGet<Person[]>(token,"options?search="+encodeURIComponent(term)));setEmployee("");}
    catch(e){setError((e as Error).message);}
  }
  return <><nav className="mx-auto max-w-3xl px-6 pt-4"><Link className="underline" href="/employee-documents">Employee documents</Link></nav>
    <main className="mx-auto max-w-3xl space-y-5 p-6"><h1 className="text-2xl font-bold">Contracts and document register</h1>
    {error && <p role="alert">{error}</p>}{pending&&<button disabled={busy} onClick={()=>write()}>Retry saved change</button>}
    <fieldset disabled={busy||pending} className="space-y-2 rounded border p-4">
      <legend>Record a pending document</legend>
      <label>Find employee<input className="block border" value={term} onChange={e=>setTerm(e.target.value)} /></label><button disabled={term.trim().length<2} onClick={search}>Search employees</button>
      <form className="space-y-2" onSubmit={e=>{e.preventDefault();void write({action:"create",employeeId:Number(employee),title,direction,dueDate:due||null});}}>
      <label>Employee<select required className="block border" value={employee} onChange={e=>setEmployee(e.target.value)}><option value="">Choose employee</option>{people.map(p=><option key={p.id} value={p.id}>{p.fullName} · {p.email}</option>)}</select></label>
      <label>Document name<input required maxLength={180} className="block border" value={title} onChange={e=>setTitle(e.target.value)} /></label>
      <label>Direction<select className="block border" value={direction} onChange={e=>setDirection(e.target.value)}><option value="send">To send</option><option value="receive">To receive</option></select></label>
      <label>Due date (optional)<input type="date" className="block border" value={due} onChange={e=>setDue(e.target.value)} /></label>
      <button>Add pending document</button></form>
    </fieldset>
    <label>Show <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);setSelected("");}}><option value="pending">Pending</option><option value="closed">Closed</option></select></label>
    <p>{total} {status} documents</p>{rows.map(row=><article className="space-y-1 rounded border p-3" key={row.id}><h2 className="font-semibold">{row.title}</h2><p>{row.employeeName} · {row.direction==="send"?"To send":"To receive"} · {row.dueDate||"No due date"}</p>
      {row.resolution?<p>{row.resolution==="cancel"?"Cancelled":row.direction==="send"?"Sent":"Received"} · {row.note}</p>:<button onClick={()=>{setSelected(row.id);setNote("");}}>Update status</button>}
      {selected===row.id&&<fieldset disabled={busy||pending}><label>Completion or cancellation note<input value={note} onChange={e=>setNote(e.target.value)} maxLength={240}/></label>
      <button disabled={!note.trim()} onClick={()=>write({action:"fulfill",id:row.id,note})}>{row.direction==="send"?"Mark sent":"Mark received"}</button>
      <button disabled={!note.trim()} onClick={()=>write({action:"cancel",id:row.id,note})}>Cancel requirement</button></fieldset>}</article>)}
      <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button> <button disabled={page*25>=total} onClick={()=>setPage(p=>p+1)}>Next</button></main></>;
}
