"use client";
import {useEffect,useRef,useState} from 'react';
import {probationGet,type Person} from '@/lib/probation-api';
import {getAuthToken} from '@/lib/auth/token';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
export function ProbationSource({value,onChange}:{value:string;onChange:(id:string)=>void}){
  const [search,setSearch]=useState(''),[rows,setRows]=useState<Person[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),alive=useRef(true),seq=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function find(){const n=++seq.current,token=getAuthToken()||'',current=()=>alive.current&&n===seq.current&&token===getAuthToken();setBusy(true);setError('');try{const people=await probationGet<Person[]>(token,'sources?search='+encodeURIComponent(search));if(current())setRows(people);}catch(e){if(current())setError(e instanceof Error?e.message:'Sources unavailable');}finally{if(current())setBusy(false);}}
  return <div className="space-y-2"><label>Find feedback source<Input aria-label="Find feedback source" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)}/></label><Button type="button" variant="outline" disabled={busy} onClick={find}>Search feedback sources</Button>{error&&<p role="alert">{error}</p>}<label>Feedback source<select aria-label="Feedback source" required value={value} onChange={e=>onChange(e.target.value)} className="border p-2 w-full"><option value="">Choose the named source</option>{value&&!rows.some(p=>String(p.id)===value)&&<option value={value}>Previously selected source</option>}{rows.map(p=><option key={p.id} value={p.id}>{p.fullName} · {p.email} · {p.status}</option>)}</select></label><p>Search returns up to twenty internal accounts, including retained inactive sources.</p></div>;
}
