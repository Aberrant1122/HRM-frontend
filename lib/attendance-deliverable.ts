import { getAuthToken } from './auth/token';
export async function openAttendanceDeliverable(url: string) {
  if (!/^\/attendance\/deliverables\/[0-9a-f-]{36}$/i.test(url)) return;
  const token = getAuthToken();
  if (!token) return;
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/, '');
  const response = await fetch(base + url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw Error('Deliverable unavailable');
  const result = await response.json();
  if (typeof result.url === 'string' && /^https?:\/\//.test(result.url)) window.open(result.url, '_blank', 'noopener,noreferrer');
}
