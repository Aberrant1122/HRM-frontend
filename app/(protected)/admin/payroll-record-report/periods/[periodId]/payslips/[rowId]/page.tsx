"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import {payrollStatement,PayPeriod,PayRow} from "@/lib/payroll-statements";
export default function Payslip(){
 const {periodId,rowId}=useParams<{periodId:string;rowId:string}>(),[data,setData]=useState<{period:PayPeriod;row:PayRow}>(),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setData(undefined);setError("");payrollStatement<{period:PayPeriod;row:PayRow}>(periodId+"/payslips/"+rowId).then(v=>{if(live)setData(v);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[periodId,rowId,retry]);
 return <main className="mx-auto max-w-2xl space-y-4 p-6"><Link className="underline" href={"/admin/payroll-record-report/periods/"+periodId}>Payroll period summary</Link>
 {error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}
 {data&&<><article id="employee-payslip" className="space-y-4 rounded border p-6">
 <h1 className="text-2xl font-bold">{["draft","reviewed"].includes(data.row.status)?"Draft payslip":"Payslip"}</h1>
 <h2 className="text-xl">{data.row.fullName}</h2><p>Employee #{data.row.employeeId} · payroll record #{data.row.id}</p>
 <p>{data.period.name} · {data.period.startDate} - {data.period.endDate} · {data.period.type}</p><p>Payroll status · {data.row.status}</p>
 <dl><dt>Gross pay</dt><dd>{data.row.gross}</dd><dt>Total deductions</dt><dd>{data.row.deductions}</dd><dt>Net pay</dt><dd>{data.row.net}</dd></dl><p>Currency {data.row.currency || "unclassified"}.</p></article>
 <a className="underline" href={"/admin/payroll-record-report/currency/row/"+rowId}>Payroll row currency</a> <button onClick={()=>window.print()}>Print payslip</button>
 <style>{'@media print { body * { visibility:hidden; } #employee-payslip, #employee-payslip * { visibility:visible; } #employee-payslip { position:fixed; left:0; top:0; width:100%; max-width:none; margin:0; border:0; box-sizing:border-box; } }'}</style></>}</main>;
}
