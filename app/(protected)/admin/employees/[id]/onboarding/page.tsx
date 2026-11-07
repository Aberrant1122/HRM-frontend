"use client";
import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { formatCalendarDate } from "@/lib/calendar-date";
import { type ManualCommand, type ManualItem } from "@/lib/actions/onboarding.actions";
import { useManualOnboarding } from "@/hooks/use-manual-onboarding";
const labels: Record<string, string> = { create: 'Checklist created', add_item: 'Item added', edit_item: 'Item details changed', complete_item: 'Item completed', waive_item: 'Item waived', reopen_item: 'Item reopened', complete_case: 'Checklist completed', reopen_case: 'Checklist reopened' };
export default function ManualChecklist() {
  const { id } = useParams<{ id: string }>(); const { user } = useAuth();
  if (!user?.id || user.role !== 'admin') return <p className="p-4">Admin access required.</p>;
  return <ChecklistEditor key={String(user.id) + ':' + user.role + ':' + id} id={id} adminId={String(user.id)} />;
}
function ChecklistEditor({ id, adminId }: { id: string; adminId: string }) {
  const [action, setAction] = useState("add_item"); const [itemId, setItemId] = useState<number | undefined>();
  const [title, setTitle] = useState(""); const [responsible, setResponsible] = useState(""); const [due, setDue] = useState(""); const [reason, setReason] = useState("");
  const resetEditor = useCallback(() => { setAction('add_item'); setItemId(undefined); setTitle(''); setResponsible(''); setDue(''); setReason(''); }, []);
  const { data, error, notice, loading, busy, pending, storageError, reload, retryStorage, send, earlier } = useManualOnboarding(id, adminId, resetEditor);
  function choose(next: string, item?: ManualItem) { setAction(next); setItemId(item?.id); setTitle(item?.title ?? ""); setResponsible(item?.responsibleId?.toString() ?? ""); setDue(item?.dueDate ?? ""); setReason(""); }
  function submit(nextAction = action) {
    if (busy || loading || pending || storageError) return;
    const command: ManualCommand = { commandKey: crypto.randomUUID(), expectedVersion: data?.onboarding?.version ?? 0, action: nextAction };
    if (nextAction.endsWith('_item') && nextAction !== 'add_item') command.itemId = itemId;
    if (['add_item','edit_item'].includes(nextAction)) Object.assign(command, { title, responsibleId: responsible ? Number(responsible) : null, dueDate: due || null });
    if (!['create','add_item'].includes(nextAction)) command.reason = reason;
    void send(command);
  }
  const person = (personId: number | null) => personId ? data?.people.find(row => row.id === personId)?.fullName || `Account #${personId}` : 'Unassigned';
  const disabled = busy || !!pending || loading || !!storageError;
  return <><Header breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Onboarding", href: "/admin/onboarding" }, { label: "Checklist" }]} />
    <div className="p-4 space-y-5"><h1 className="text-3xl font-bold">Onboarding checklist</h1>
      <p>Manual tracking only. Assignment grants no access. Completion does not activate an account, confirm probation or change employment.</p>
      {loading && <p role="status">Loading checklist…</p>}{error && <div role="alert" className="text-red-600">{error}</div>}{notice && <p role="status">{notice}</p>}
      {storageError && <div role="alert" className="space-y-2"><p>{storageError}</p><Button variant="outline" disabled={busy} onClick={retryStorage}>Check retry storage</Button></div>}
      {pending && <Card><CardContent className="pt-5 space-y-3"><p>An unconfirmed change is retained. Retry the same change before continuing; keep this tab open if retry storage is unavailable.</p><Button disabled={busy || loading} onClick={() => send(pending)}>Retry same change</Button></CardContent></Card>}
      {!pending && <Button variant="outline" disabled={busy || loading} onClick={reload}>Reload checklist</Button>}
      {data && <><Card><CardHeader><CardTitle>{data.employee.fullName}</CardTitle></CardHeader><CardContent><p>{data.employee.email} · Account: {data.employee.status}</p><p>Checklist: {data.onboarding?.status ?? 'Not started'}</p><Link className="underline" href={`/admin/employees/${id}`}>View employee profile</Link></CardContent></Card>
      {!data.onboarding ? <Button disabled={disabled || data.employee.role !== 'employee'} onClick={() => submit('create')}>Start manual checklist</Button> : <>
        <Card><CardHeader><CardTitle>Manual items</CardTitle></CardHeader><CardContent className="space-y-4">
          {!data.items.length && <p>No items yet. Add the manual steps needed for this employee.</p>}
          {data.items.map(item => <section key={item.id} aria-label={item.title} className="border rounded-md p-4 space-y-3"><h2 className="font-semibold">{item.title}</h2>
            <p>Status: {item.status} · Responsible: {person(item.responsibleId)} · Due: {formatCalendarDate(item.dueDate)}</p>
            <div className="flex flex-wrap gap-2">{data.onboarding?.status === 'open' && (item.status === 'pending' ? <>
              <Button variant="outline" disabled={disabled} onClick={() => choose('edit_item', item)}>Edit item</Button><Button disabled={disabled} onClick={() => choose('complete_item', item)}>Complete item</Button><Button variant="outline" disabled={disabled} onClick={() => choose('waive_item', item)}>Waive item</Button>
            </> : <Button variant="outline" disabled={disabled} onClick={() => choose('reopen_item', item)}>Reopen item</Button>)}</div></section>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Checklist actions</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">{data.onboarding.status === 'open' ? <><Button variant="outline" disabled={disabled} onClick={() => choose('add_item')}>Add manual item</Button><Button variant="outline" disabled={disabled} onClick={() => choose('complete_case')}>Complete checklist</Button></> : <Button variant="outline" disabled={disabled} onClick={() => choose('reopen_case')}>Reopen checklist</Button>}</div>
          {(data.onboarding.status === 'open' || action === 'reopen_case') && <form className="max-w-xl" onSubmit={event => { event.preventDefault(); submit(); }}><fieldset disabled={disabled} className="grid gap-3">
            {itemId && <p>Selected item: {data.items.find(item => item.id === itemId)?.title}</p>}
            {['add_item','edit_item'].includes(action) && <><label>Item title<Input value={title} maxLength={200} required onChange={event => setTitle(event.target.value)} /></label>
              <label>Responsible account ID (optional)<Input type="number" min="1" step="1" value={responsible} onChange={event => setResponsible(event.target.value)} /></label>
              <Button type="button" variant="outline" disabled={disabled} onClick={() => setResponsible(adminId)}>Assign to me</Button>
              <label>Due date (optional)<Input type="date" min="1000-01-01" max="9999-12-31" value={due} onChange={event => setDue(event.target.value)} /></label></>}
            {action !== 'add_item' && <label>Reason<Input required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>}
            <Button disabled={disabled} type="submit">Save change</Button>
          </fieldset></form>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Checklist history</CardTitle></CardHeader><CardContent className="space-y-4">
          {data.history.map(event => <article key={event.id} className="border-b pb-3"><h3 className="font-medium">{labels[event.action] || event.action}</h3><p>{person(event.actorId)} · {new Date(event.createdAt).toLocaleString()}</p>
            {event.details.reason && <p>Reason: {event.details.reason}</p>}
            {typeof event.details.after === 'object' && <p>{event.details.after?.title} · Status: {event.details.after?.status} · Responsible: {person(event.details.after?.responsibleId ?? null)} · Due: {formatCalendarDate(event.details.after?.dueDate)}</p>}
          </article>)}
          {data.hasEarlierHistory && <Button variant="outline" disabled={busy} onClick={earlier}>Load earlier history</Button>}
        </CardContent></Card>
      </>}</>}
    </div></>;
}
