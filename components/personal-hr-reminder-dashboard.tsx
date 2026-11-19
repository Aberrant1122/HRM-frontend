"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {getAuthToken} from '@/lib/auth/token';
type Reminder={id:string;title:string;firstDate:string;endDate:string|null;intervalDays:number};
type Due={owner:string;date:string;zone:string;rows:Reminder[];hasMore:boolean};
const endpoint=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,'')+'/hr-tasks/reminders';
const localDay=()=>{const now=new Date();return[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');};
export function PersonalHrReminderDashboard(){
 const {user}=useAuth(),token=getAuthToken()||'',[due,setDue]=useState<Due|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true,sequence=0,lastDay='';setDue(null);setError('');if(!token||user?.role!=='admin')return;
  const load=async()=>{const request=++sequence,date=localDay();lastDay=date;setDue(null);setError('');const current=()=>live&&request===sequence&&getAuthToken()===token;
   try{const response=await fetch(endpoint+'?mode=due&on='+date+'&page=1',{headers:{authorization:'Bearer '+token},cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.message||'Personal reminders unavailable');if(current())setDue({owner:token,date,zone:Intl.DateTimeFormat().resolvedOptions().timeZone||'browser local time',rows:data.rows,hasMore:data.hasMore});}
   catch(e){if(current())setError((e as Error).message);}
  };void load();const focus=()=>{void load();},timer=window.setInterval(()=>{if(localDay()!==lastDay)void load();},60000);window.addEventListener('focus',focus);
  return()=>{live=false;sequence++;window.clearInterval(timer);window.removeEventListener('focus',focus);};
 },[token,user?.id,user?.role,retry]);
 if(user?.role!=='admin')return null;const current=due?.owner===token?due:null;
 return <section aria-label="Your recurring HR reminders" className="space-y-3 rounded-lg border p-4"><h2 className="text-xl font-semibold">Your recurring HR reminders</h2><p>Due reminders appear automatically when you open or return to this dashboard. The browser’s local date refreshes after midnight; these are your personal schedules.</p>{error?<><p role="alert">{error}</p><button className="underline" onClick={()=>setRetry(n=>n+1)}>Retry personal reminders</button></>:!current?<p>Loading your due reminders…</p>:<><p>Due on {current.date} · {current.zone} · {current.rows.length} shown{current.hasMore?'; more due reminders are available':''}</p>{current.rows.length===0&&<p>No personal reminders due today.</p>}{current.rows.map(row=><article className="border-t py-2" key={row.id}><h3>{row.title}</h3><p>Every {row.intervalDays} days from {row.firstDate}{row.endDate?' through '+row.endDate:''}</p></article>)}</>}<Link className="underline" href="/admin/hr-tasks/reminders">Manage all personal reminder schedules</Link></section>;
}
