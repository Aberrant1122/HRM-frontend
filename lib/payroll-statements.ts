import {getAuthToken} from "@/lib/auth/token";
export type PayPeriod={currency:string|null;id:number;name:string;startDate:string;endDate:string;type:string;status:string};
export type PayRow={currency:string|null;id:number;employeeId:number;fullName:string;status:string;locked:number;gross:string;deductions:string;net:string};
export type PayGroup={currency:string|null;status:string;records:number;gross:string;deductions:string;net:string};
export async function payrollStatement<T>(path:string):Promise<T>{
 const token=getAuthToken();if(!token)throw Error("Sign in to view payroll");
 const base=(process.env.NEXT_PUBLIC_BACKEND_URL||"http://localhost:5005/api/").replace(/\/$/,"");
 const response=await fetch(base+"/payroll-record-report/periods/"+path,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
 const data=await response.json();if(getAuthToken()!==token)throw Error("Account changed");if(!response.ok)throw Error(data.message||"Payroll statement unavailable");return data;
}
