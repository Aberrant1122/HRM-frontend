"use client";
import { useState } from 'react';
import { getAuthToken } from '@/lib/auth/token';

export function AssignChecklistTask({ kind, itemId, caseVersion, assigneeId }: {
  kind: 'onboarding' | 'offboarding'; itemId: number; caseVersion: number; assigneeId: number;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [submission,setSubmission] = useState(''), [approval,setApproval] = useState('');
  async function assign() {
    const token = getAuthToken();
    if (!token || busy) return;
    setBusy(true);
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/, '');
      const response = await fetch(base + '/hr-tasks/checklist/' + kind + '/' + itemId, {
        method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseVersion, assigneeId, ...(submission && {submissionDueDate:submission}), ...(approval && {approvalDueDate:approval}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Assignment failed');
      if (getAuthToken() === token) setMessage('Linked HR task #' + result.data.taskId);
    } catch (error) {
      if (getAuthToken() === token) setMessage(error instanceof Error ? error.message : 'Retry this assignment');
    } finally { setBusy(false); }
  }
  return <div><label>Task submission deadline <input type="date" value={submission} onChange={e=>setSubmission(e.target.value)}/></label><label>Task approval deadline <input type="date" value={approval} onChange={e=>setApproval(e.target.value)}/></label><button type="button" className="border rounded px-3 py-1" disabled={busy} onClick={assign}>Assign HR task to responsible person</button>{message && <p role="status">{message}</p>}</div>;
}
