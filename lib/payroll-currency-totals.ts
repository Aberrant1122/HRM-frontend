import type { EmployeePayroll } from './types/payroll.types';
export function payrollCurrencyTotals(rows:EmployeePayroll[],field:'net_salary'|'gross_salary'|'total_deductions',average=false){
 const groups=new Map<string,{sum:number;count:number}>();
 let unknown=0;
 for(const row of rows){
  if(!row.currency){unknown++;continue;}
  const amount=Number(row[field]),group=groups.get(row.currency)||{sum:0,count:0};
  group.sum+=Math.round(amount*100);group.count++;groups.set(row.currency,group);
 }
 const values=Array.from(groups,([code,g])=>code+' '+(g.sum/100/(average?g.count:1)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
 if(unknown)values.push(unknown+' unclassified');
 return values.join(' · ') || 'No records';
}
