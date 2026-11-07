import { getAuthToken } from './auth/token';
import type { ClockOutResponse } from './types/attendance.types';

export type Checkout = { taskId?: number; taskStatus?: string; workNote?: string; deliverableLink?: string; deliverables?: File[] };
type Pending = { scope: string; key: string; action: 'in' | 'out'; workDate: string; attendanceId: number | null; data: Checkout };
const base = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/, '');
const scopeFor = (token: string) => String(JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id);
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('hrm-attendance-retry', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('commands', { keyPath: 'scope' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error('Retry storage unavailable. No new command was sent.'));
  });
}
async function stored(scope: string, value?: Pending | null): Promise<Pending | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('commands', value === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('commands');
      const request = value === undefined ? store.get(scope) : value === null ? store.delete(scope) : store.add(value);
      let result: Pending | undefined;
      request.onsuccess = () => { result = request.result as Pending | undefined; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(Error('Retry storage unavailable. Keep this page open and retry.'));
    });
  } finally { db.close(); }
}
export async function pendingAttendance(token: string) { return stored(scopeFor(token)); }
export async function attendanceCommand<T = ClockOutResponse>(token: string, action: 'in' | 'out', data: Checkout = {}, retry = false): Promise<{ data?: T; error?: string; status?: number; pending?: boolean }> {
  let pending: Pending;
  try {
    const scope = scopeFor(token), existing = await stored(scope);
    if (existing && !retry) return { error: 'An unconfirmed attendance change is saved. Use Retry saved attendance change.', pending: true };
    if (retry && !existing) return { error: 'No saved attendance change found. Refresh attendance before continuing.' };
    if (existing) pending = existing;
    else {
      const response = await fetch(base + '/attendance/today', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const today = await response.json();
      if (!response.ok || today.recordState === 'conflict') return { error: today.message || 'Review conflicting attendance records before saving.' };
      pending = { scope, key: crypto.randomUUID(), action, data, workDate: today.date, attendanceId: today.id || null };
      await stored(scope, pending); // Atomic add and transaction completion before dispatch; files use structured clone.
    }
    let result: { data?: T; error?: string; status?: number; pending?: boolean } = {};
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (getAuthToken() !== token) return { error: 'Account changed; the original command remains saved.', pending: true };
        const body = { ...pending.data, deliverables: undefined, workDate: pending.workDate, ...(pending.action === 'out' ? { attendanceId: pending.attendanceId } : {}) };
        const files = pending.data.deliverables || [];
        const form = new FormData();
        for (const [key, value] of Object.entries(body)) if (value !== undefined && value !== null) form.append(key, String(value));
        files.forEach(file => form.append('deliverables', file));
        const response = await fetch(base + '/attendance/clock-' + pending.action, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': pending.key, ...(!files.length ? { 'Content-Type': 'application/json' } : {}) }, body: files.length ? form : JSON.stringify(body) });
        const json = await response.json();
        if (response.ok) {
          try { await stored(scope, null); } catch (_) { /* Committed result stays successful; retained receipt can safely replay. */ }
          window.dispatchEvent(new Event('attendance-retry-change'));
          return { data: json as T };
        }
        result = { error: json.message || 'Attendance save failed', status: response.status, pending: true };
        if ([400, 404].includes(response.status) || response.status === 409 && !String(json.message).includes('bound')) {
          await stored(scope, null);
          result.pending = false;
        }
        // Server 4xx is definitive; keep identity for review rather than silently replace it.
        if (response.status < 500) break;
      } catch (_) { result = { error: 'Attendance outcome is unconfirmed. Retry the saved change.', pending: true }; }
    }
    window.dispatchEvent(new Event('attendance-retry-change'));
    return result;
  } catch (error) { return { error: error instanceof Error ? error.message : 'Retry storage unavailable. No new command was sent.' }; }
}
