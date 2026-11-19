"use client";
import {useCallback,useEffect,useState} from "react";
import {getAuthToken} from "@/lib/auth/token";
import {employeeDocumentGet,employeeDocumentSave,pendingEmployeeDocument} from "@/lib/employee-document-api";
type Dates={version:number;expiryDate:string|null;reminderDate:string|null;reason:string};
const command="expiry/commands";
export function DocumentExpiry({revisionId}:{revisionId:number}){
  const [current,setCurrent]=useState<Dates|null>(),[expiry,setExpiry]=useState(""),[reminder,setReminder]=useState(""),[reason,setReason]=useState("");
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[pending,setPending]=useState(false);
  const refresh=useCallback(async()=>{
    const token=getAuthToken();if(!token)return;
    const [d,saved]=await Promise.all([employeeDocumentGet<Dates|null>(token,"expiry/"+revisionId),pendingEmployeeDocument(token,command)]);
    if(token===getAuthToken()){setCurrent(d);setExpiry(d?.expiryDate||"");setReminder(d?.reminderDate||"");setPending(!!saved);}
  },[revisionId]);
  useEffect(()=>{void refresh().catch(e=>setError(e.message));},[refresh]);
  async function write(mode:"set"|"clear"|"retry"){
    const token=getAuthToken();if(!token||busy)return;setBusy(true);setError("");
    try{
      await employeeDocumentSave(token,command,mode==="retry"?undefined:{revisionId,expectedVersion:current?.version||0,expiryDate:mode==="clear"?null:expiry,reminderDate:mode==="clear"?null:reminder,reason},mode==="retry");
      setReason("");
    }catch(e){setError((e as Error).message);}
    finally{try{await refresh();}catch(e){setError((e as Error).message);}setBusy(false);}
  }
  return <section className="space-y-2 rounded border p-3" aria-label="Document expiry">
    <h3 className="font-semibold">Document expiry</h3>
    {current !==undefined&&<p>{current?.expiryDate?"Expires "+current.expiryDate+" · reminder "+current.reminderDate:"No expiry reminder recorded"}</p>}
    {error&&<p role="alert">{error}</p>}{pending&&<button disabled={busy} onClick={()=>write("retry")}>Recover saved expiry change</button>}
    <form onSubmit={e=>{e.preventDefault();void write("set");}}><fieldset disabled={current===undefined||pending||busy} className="space-y-2">
      <label>Expiry date<input type="date" required className="block border" value={expiry} onChange={e=>setExpiry(e.target.value)}/></label>
      <label>Reminder date<input type="date" required max={expiry||undefined} className="block border" value={reminder} onChange={e=>setReminder(e.target.value)}/></label>
      <label>Reminder change reason<textarea required maxLength={600} className="block border" value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <button>Save expiry reminder</button> {current?.expiryDate&&<button type="button" disabled={!reason.trim()} onClick={()=>write("clear")}>Clear reminder</button>}
    </fieldset></form></section>;
}
