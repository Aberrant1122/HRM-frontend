"use client";
import {useEffect,useRef,useState} from 'react';
import {organizationGet,type Person,type Department} from '@/lib/organization-api';
import {getAuthToken} from '@/lib/auth/token';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
export function OrganizationChoice({kind,value,onChange,selected}:{kind:'people'|'departments';value:string;onChange:(id:string)=>void;selected:string}){
  const label=kind==='people'?'Primary reporting manager':'Department', [search,setSearch]=useState(''),[rows,setRows]=useState<(Person|Department)[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),alive=useRef(true),seq=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function find(){const n=++seq.current,token=getAuthToken()||'',current=()=>alive.current&&n===seq.current&&token===getAuthToken();setBusy(true);setError('');try{const r=await organizationGet<(Person|Department)[]>(token,'options?kind='+kind+'&search='+encodeURIComponent(search));if(current())setRows(r);}catch(e){if(current())setError(e instanceof Error?e.message:'Unavailable');}finally{if(current())setBusy(false);}}
  return <div className="space-y-2"><label>Find {label.toLowerCase()}<Input aria-label={'Find '+label.toLowerCase()} maxLength={100} value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();find();}}}/></label><Button type="button" variant="outline" disabled={busy} onClick={find}>Search {label.toLowerCase()}</Button>{error&&<p role="alert">{error}</p>}<label>{label}<select className="border p-2 w-full" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">Unassigned</option>{value&&!rows.some(r=>String(r.id)===value)&&<option value={value}>{selected||'Selected assignment'}</option>}{rows.map(r=><option value={r.id} key={r.id}>{'fullName' in r?r.fullName+' · '+r.email:r.name}</option>)}</select></label><p>Search returns up to twenty active choices. Current inactive references remain visible until explicitly changed.</p></div>;
}
