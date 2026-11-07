'use client';
import { useEffect, useState } from 'react';
import { attendanceCommand, pendingAttendance } from '@/lib/attendance-retry';
import { getAuthToken } from '@/lib/auth/token';
import { Button } from '@/components/ui/button';
export function AttendanceRetry() {
  const [pending, setPending] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    let alive = true;
    const check = async () => { const token = getAuthToken(); if (!token) return; try { const command = await pendingAttendance(token); if (alive) setPending(!!command); } catch (_) { if (alive) setMessage('Retry storage is unavailable. Attendance changes will wait until storage recovers.'); } };
    void check(); window.addEventListener('attendance-retry-change', check);
    return () => { alive = false; window.removeEventListener('attendance-retry-change', check); };
  }, []);
  if (!pending && !message) return null;
  return <div role="status" className="rounded border p-4"><p>{message || 'An unconfirmed attendance change is saved with its original files. Retry it before starting another change.'}</p>{pending && <Button disabled={busy} onClick={async () => {
    const token = getAuthToken(); if (!token) return; setBusy(true);
    try { const result = await attendanceCommand(token, 'in', {}, true); if (getAuthToken() !== token) return; if (result.data) window.location.reload(); else setMessage(result.error || 'Retry remains pending.'); }
    finally { setBusy(false); }
  }}>Retry saved attendance change</Button>}</div>;
}
