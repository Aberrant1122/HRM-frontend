"use client";
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {LeaveWorkflow} from '@/components/leave/workflow';
export default function Page(){const {id}=useParams<{id:string}>(),{user}=useAuth();return <main className="p-4 space-y-4"><Link className="underline" href={'/'+(user?.role||'employee')+'/dashboard'}>Back to dashboard</Link><LeaveWorkflow mode="detail" id={id}/></main>;}
