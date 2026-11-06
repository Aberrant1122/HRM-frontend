"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { formatCalendarDate } from "@/lib/calendar-date";
import { onboardingRequest, OnboardingError, type ManualOnboarding, type ManualCommand, type ManualItem } from "@/lib/actions/onboarding.actions";
const labels: Record<string, string> = { create: 'Checklist created', add_item: 'Item added', edit_item: 'Item details changed', complete_item: 'Item completed', waive_item: 'Item waived', reopen_item: 'Item reopened', complete_case: 'Checklist completed', reopen_case: 'Checklist reopened' };
export default function ManualChecklist() {
  const { id } = useParams<{ id: string }>(); const { user } = useAuth();
  const [data, setData] = useState<ManualOnboarding | null>(null); const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ManualCommand | null>(null); const [notice, setNotice] = useState("");
  const [action, setAction] = useState("add_item"); const [itemId, setItemId] = useState<number | undefined>();
  const [title, setTitle] = useState(""); const [responsible, setResponsible] = useState(""); const [due, setDue] = useState(""); const [reason, setReason] = useState("");
  const storageKey = `manual-onboarding:${user?.id}:${id}`;
  useEffect(() => {
    let cancelled = false; setLoading(true); setData(null); setError(""); setNotice(""); setAction('add_item');
    onboardingRequest(id).then(result => { if (!cancelled) setData(result.data); }).catch(error => { if (!cancelled) setError(error.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);
  useEffect(() => { if (user?.id) { try { const value = sessionStorage.getItem(storageKey); setPending(value ? JSON.parse(value) : null); } catch { setPending(null); } } }, [storageKey, user?.id]);
  async function reload() { setLoading(true); try { setData((await onboardingRequest(id)).data); setError(""); } catch (error) { setError((error as Error).message); } finally { setLoading(false); } }
  function choose(next: string, item?: ManualItem) { setAction(next); setItemId(item?.id); setTitle(item?.title ?? ""); setResponsible(item?.responsibleId?.toString() ?? ""); setDue(item?.dueDate ?? ""); setReason(""); setNotice(""); }
  async function send(command: ManualCommand) {
    setBusy(true); setError(""); setNotice(""); setPending(command); sessionStorage.setItem(storageKey, JSON.stringify(command));
    try {
      const result = await onboardingRequest(id, command); setData(result.data); setPending(null); sessionStorage.removeItem(storageKey);
      setNotice(result.replayed ? 'Saved earlier; no duplicate history was added.' : 'Checklist saved. Account access and employment status are unchanged.');
      choose('add_item'); setNotice(result.replayed ? 'Saved earlier; no duplicate history was added.' : 'Checklist saved. Account access and employment status are unchanged.');
    } catch (error) {
      if (error instanceof OnboardingError && error.status < 500) {
        setPending(null); sessionStorage.removeItem(storageKey); await reload();
        setError(error.status === 409 ? `${error.message} Latest checklist loaded; review before submitting a new change.` : error.message);
      } else setError('The save outcome is uncertain. Retry the same change to avoid duplicate history.');
    } finally { setBusy(false); }
  }
  function submit(nextAction = action) {
    const command: ManualCommand = { commandKey: crypto.randomUUID(), expectedVersion: data?.onboarding?.version ?? 0, action: nextAction };
    if (nextAction.endsWith('_item') && nextAction !== 'add_item') command.itemId = itemId;
    if (['add_item','edit_item'].includes(nextAction)) Object.assign(command, { title, responsibleId: responsible ? Number(responsible) : null, dueDate: due || null });
    if (!['create','add_item'].includes(nextAction)) command.reason = reason;
    send(command);
  }
  async function earlier() {
    if (!data?.history.length) return; setBusy(true);
    try { const result = await onboardingRequest(id, undefined, data.history[data.history.length - 1].version);
      setData({ ...data, history: [...data.history, ...result.data.history], people: [...data.people, ...result.data.people], hasEarlierHistory: result.data.hasEarlierHistory });
    } catch { setError('Earlier history unavailable. Retry loading earlier history.'); } finally { setBusy(false); }
  }
  const person = (personId: number | null) => personId ? data?.people.find(row => row.id === personId)?.fullName || `Account #${personId}` : 'Unassigned';
  const disabled = busy || !!pending || loading;
  return <><Header breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Onboarding", href: "/admin/onboarding" }, { label: "Checklist" }]} />
    <div className="p-4 space-y-5"><h1 className="text-3xl font-bold">Onboarding checklist</h1>
      <p>Manual tracking only. Assignment grants no access. Completion does not activate an account, confirm probation or change employment.</p>
      {loading && <p role="status">Loading checklist…</p>}{error && <div role="alert" className="text-red-600">{error}</div>}{notice && <p role="status">{notice}</p>}
      {pending && <Card><CardContent className="pt-5 space-y-3"><p>An unconfirmed change is retained in this tab. Retry the same change before continuing.</p><Button disabled={busy} onClick={() => send(pending)}>Retry same change</Button></CardContent></Card>}
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
          {(data.onboarding.status === 'open' || action === 'reopen_case') && <form className="grid gap-3 max-w-xl" onSubmit={event => { event.preventDefault(); submit(); }}>
            {itemId && <p>Selected item: {data.items.find(item => item.id === itemId)?.title}</p>}
            {['add_item','edit_item'].includes(action) && <><label>Item title<Input value={title} maxLength={200} required onChange={event => setTitle(event.target.value)} /></label>
              <label>Responsible account ID (optional)<Input type="number" min="1" step="1" value={responsible} onChange={event => setResponsible(event.target.value)} /></label>
              <Button type="button" variant="outline" disabled={disabled} onClick={() => setResponsible(String(user.id))}>Assign to me</Button>
              <label>Due date (optional)<Input type="date" min="1000-01-01" max="9999-12-31" value={due} onChange={event => setDue(event.target.value)} /></label></>}
            {action !== 'add_item' && <label>Reason<Input required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>}
            <Button disabled={disabled} type="submit">Save change</Button>
          </form>}
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
