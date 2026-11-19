"use client";
import {useState,useEffect,useRef} from 'react';
import {useAuth} from '@/context/AuthContext';
import {getAuthToken} from '@/lib/auth/token';
import {downloadEmployeeDocument} from '@/lib/employee-document-api';
type Delivery={revisionId:number;sharedAt:string;acknowledgedAt:string|null;title:string;number:number;format?:string;filename?:string};
type Receipt={revisionId:number;recipientId:number;sharedBy:number;sharedAt:string;acknowledgedAt:string|null};
async function request<T>(token:string,path:string,body?:object):Promise<T>{
 if(!token||getAuthToken()!==token)throw Error('Sign in to continue');
 const base=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,'');
 const r=await fetch(base+'/employee-documents/deliveries/'+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)})}),payload=await r.json();
 if(getAuthToken()!==token)throw Error('Account changed');
 if(!r.ok)throw Error(payload.message||'Delivery unavailable');return payload.data;
}
export function ShareRevision(props:{revisionId:number;recipientId:number;name:string}){
 const{user}=useAuth();return user&&['admin','hr'].includes(user.role)?<Share key={user.id+':'+getAuthToken()+':'+props.revisionId} {...props}/>:null;
}
function Share({revisionId,recipientId,name}:{revisionId:number;recipientId:number;name:string}){
 const token=getAuthToken()||'',[record,setRecord]=useState<Receipt|null>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),alive=useRef(true),seq=useRef(0),current=(n:number)=>alive.current&&seq.current===n&&getAuthToken()===token;
 async function load(){const n=++seq.current;setBusy(true);setRecord(undefined);setError('');try{const r=await request<Receipt|null>(token,'staff/'+revisionId);if(current(n))setRecord(r);}catch(e){if(current(n))setError(e instanceof Error?e.message:'Sharing status unavailable');}finally{if(current(n))setBusy(false);}}
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;seq.current++;};},[revisionId,token]); // eslint-disable-line react-hooks/exhaustive-deps
 async function share(){if(busy||record!==null)return;const n=++seq.current;setBusy(true);setError('');try{const r=await request<Receipt>(token,'staff/'+revisionId+'/share',{recipientId});if(current(n))setRecord(r);}catch(e){if(current(n)){setRecord(undefined);setError(e instanceof Error?e.message:'Sharing outcome unavailable; reload status');}}finally{if(current(n))setBusy(false);}}
 return <section aria-label="Employee document acknowledgement"><h3>Employee acknowledgement</h3><p>Selected owner: {name}</p><button disabled={busy} onClick={load}>Reload sharing status</button>{record?<><p>{record.acknowledgedAt?'Acknowledged '+record.acknowledgedAt:'Shared, awaiting acknowledgement'}</p><p>Shared with {name} on {record.sharedAt}</p></>:<button disabled={busy||record===undefined} onClick={share}>Share this version with {name}</button>}{error&&<p role="alert">{error}</p>}</section>;
}
export function MyDocuments(){const{user}=useAuth();return user&&['admin','hr','employee','manager'].includes(user.role)?<Inbox key={user.id+':'+getAuthToken()}/>:<p>Current internal account required.</p>;}
function Inbox(){
 const token=getAuthToken()||'',[rows,setRows]=useState<Delivery[]|null>(null),[more,setMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),alive=useRef(true),seq=useRef(0),current=(n:number)=>alive.current&&seq.current===n&&getAuthToken()===token;
 async function load(before?:number){const n=++seq.current;setBusy(true);setError('');if(!before){setRows(null);setMore(false);}try{const r=await request<{rows:Delivery[];hasMore:boolean}>(token,'mine'+(before?'?before='+before:''));if(current(n)){setRows(old=>before?[...(old||[]),...r.rows]:r.rows);setMore(r.hasMore);}}catch(e){if(current(n)){setRows(null);setMore(false);setError(e instanceof Error?e.message:'Documents unavailable');}}finally{if(current(n))setBusy(false);}}
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;seq.current++;};},[token]); // eslint-disable-line react-hooks/exhaustive-deps
 async function acknowledge(row:Delivery){if(busy)return;const n=++seq.current;setBusy(true);setError('');try{const receipt=await request<Receipt>(token,'mine/'+row.revisionId+'/acknowledge',{});if(current(n))setRows(list=>list?.map(item=>item.revisionId===row.revisionId?{...item,acknowledgedAt:receipt.acknowledgedAt}:item)||null);}catch(e){if(current(n)){setRows(null);setMore(false);setError(e instanceof Error?e.message:'Acknowledgement outcome unavailable; reload documents');}}finally{if(current(n))setBusy(false);}}
 async function download(row:Delivery){if(busy)return;const n=++seq.current;setBusy(true);setError('');try{await downloadEmployeeDocument(token,row.revisionId,true);}catch(e){if(current(n)){setRows(null);setMore(false);setError(e instanceof Error?e.message:'Download unavailable');}}finally{if(current(n))setBusy(false);}}
 return <main className="p-6 space-y-3"><h1>Documents shared with me</h1><button disabled={busy} onClick={()=>void load()}>Reload shared documents</button>{busy&&<p role="status">Loading documents…</p>}{error&&<p role="alert">{error}</p>}{rows&&!rows.length&&<p>No documents have been shared with you.</p>}{rows?.map(row=><section aria-label={'Shared revision '+row.revisionId} key={row.revisionId} className="border p-3 space-y-2"><h2>{row.title} · version {row.number}</h2><p>Shared {row.sharedAt} · {(row.format||"pdf").toUpperCase()} · {row.filename}</p><button disabled={busy} onClick={()=>void download(row)}>Download {(row.format||"pdf").toUpperCase()}</button>{row.acknowledgedAt?<p>Acknowledged {row.acknowledgedAt}</p>:<button disabled={busy} onClick={()=>void acknowledge(row)}>Acknowledge this version</button>}</section>)}{more&&<button disabled={busy} onClick={()=>void load(rows?.at(-1)?.revisionId)}>More documents</button>}</main>;
}

