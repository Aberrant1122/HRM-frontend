"use client";
import {useEffect, useState} from "react";
import Link from "next/link";
import {getAuthToken} from "@/lib/auth/token";
import {employeeDocumentGet} from "@/lib/employee-document-api";
export function PendingDocumentSummary(){
  const [count,setCount]=useState<number>(),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;
    const token=getAuthToken();
    if(token) employeeDocumentGet<{total:number}>(token,"exchanges").then(r=>{
      if(active && token===getAuthToken()){setCount(r.total);setError(false);}
    }).catch(()=>{if(active)setError(true);});
    return ()=>{active=false;};
  },[retry]);
  return <section className="space-y-2 rounded-lg border p-4"><h2 className="font-semibold">Pending contracts and documents</h2>
    {error ? <button className="underline" onClick={()=>setRetry(n=>n+1)}>Unavailable · retry</button> : <p>{count === undefined ? "Loading…" : count+" pending"}</p>}
    <Link className="underline" href="/employee-documents/exchanges">Open document register</Link></section>;
}
