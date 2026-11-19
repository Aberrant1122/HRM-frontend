"use client";
import Link from 'next/link';import {useAuth} from '@/context/AuthContext';import {AttendanceClockAlerts} from '@/components/attendance-clock-alerts';
export default function Page(){const {user}=useAuth();return <main className="mx-auto max-w-4xl p-6 space-y-4"><Link href={user?.role==='hr'?'/employee-documents':'/'+(user?.role||'employee')+'/dashboard'}>Back to dashboard</Link><AttendanceClockAlerts full/></main>;}
