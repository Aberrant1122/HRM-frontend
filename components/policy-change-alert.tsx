"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {getAuthToken} from "@/lib/auth/token";
import {policyGet} from "@/lib/policy-api";
type Updates={total:number;rows:{assignmentId:number;title:string;revision:number}[]};
export function PolicyChangeAlert(){
 const [summary,setSummary]=useState<Updates>(),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let live=true,request=0;
  const load=async()=>{
   const token=getAuthToken(),seq=++request;if(!token)return;
   try{const data=await policyGet<Updates>(token,"changes");if(live&&request===seq&&getAuthToken()===token){setSummary(data);setError(false);}}
   catch{if(live&&request===seq)setError(true);}
  };
  void load();window.addEventListener("focus",load);
  return()=>{live=false;window.removeEventListener("focus",load);};
 },[retry]);
 if(error)return <button className="text-sm underline" onClick={()=>setRetry(n=>n+1)}>Retry policy notices</button>;
 if(!summary?.total||!summary.rows.length)return null;
 return <Link className="rounded border px-2 py-1 text-sm font-medium" href={"/policies?assignment="+summary.rows[0].assignmentId}>Policy updates ({summary.total})</Link>;
}
