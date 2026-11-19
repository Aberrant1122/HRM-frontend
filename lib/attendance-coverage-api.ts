import {getAuthToken} from './auth/token';
const base=(process.env.NEXT_PUBLIC_BACKEND_URL||'http://localhost:5005/api/').replace(/\/$/,'');
export async function attendanceCoverageGet<T>(token:string,path:string):Promise<T>{const r=await fetch(base+'/attendance/'+path,{headers:{Authorization:'Bearer '+token},cache:'no-store'}),body=await r.json();if(getAuthToken()!==token)throw Error('Account changed');if(!r.ok)throw Object.assign(Error(body.message||'Raw attendance coverage unavailable'),{status:r.status});return body.data;}
