"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth/token";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";

type Row = { fullName: string; email: string; status: string; delivery?: string };
type Batch = { id: string; createdAt: string; rows: Row[] };
const endpoint = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api").replace(/\/+$/, "") + "/auth/employee-imports";

async function request(data?: object) {
  const response = await fetch(endpoint, {
    method: data ? "POST" : "GET",
    headers: {Authorization: "Bearer " + getAuthToken(), "Content-Type": "application/json"},
    cache: "no-store",
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Error(body.message || "Request failed. Refresh history to see which rows were saved.");
  }
  return response.json();
}

export default function ImportEmployees() {
  const [input, setInput] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [id, setId] = useState("");
  const load = useCallback(async () => {
    try { setBatches(await request()); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(event?: FormEvent, resume?: string) {
    event?.preventDefault();
    setError("");
    const lines = input.trim().split(/\r?\n/);
    const rows = lines.map(line => line.split("\t"));
    if (!resume && (rows.length > 50 || rows.some(row => row.length !== 2))) {
      setError("Paste two tab-separated columns, with one employee per line and up to 50 employees.");
      return;
    }
    const command = resume || id || crypto.randomUUID();
    if (!resume) setId(command);
    setBusy(true);
    try {
      await request(resume ? {id: command} : {id: command, rows: rows.map(([fullName, email]) => ({fullName, email}))});
      if (!resume) { setInput(""); setId(""); }
    } catch (e) { setError((e as Error).message); }
    finally { await load(); setBusy(false); }
  }
  return <>
    <Header breadcrumbs={[{label:"Employees",href:"/admin/employees"},{label:"Bulk addition"}]} />
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <Link className="underline" href="/admin/employees/add">Back to add employee</Link>
      <h1 className="text-2xl font-bold">Add employees in bulk</h1>
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="employees">Paste full names and email addresses from two spreadsheet columns. Omit the header row. Each new employee receives an invitation to set their password.</label>
        <textarea id="employees" rows={6} required disabled={busy} className="w-full rounded border p-2" value={input} onChange={e => {setInput(e.target.value);setId("");}} />
        <Button disabled={busy}>Invite employees</Button>
      </form>
      {error && <p role="alert">{error}</p>}
      <h2 className="text-xl font-semibold">Your recent imports</h2>
      <Button variant="outline" disabled={busy} onClick={load}>Refresh history</Button>
      {batches.map(batch => <section key={batch.id} className="space-y-2 rounded border p-3">
        <h3>{new Date(batch.createdAt).toLocaleString()}</h3>
        <table className="w-full text-left"><thead><tr><th>Employee</th><th>Email</th><th>Result</th></tr></thead>
          <tbody>{batch.rows.map((row, index) => <tr key={index}><td>{row.fullName}</td><td>{row.email}</td><td>{row.status}{row.delivery && " · invitation " + row.delivery}</td></tr>)}</tbody></table>
        {batch.rows.some(row => row.status === "pending") && <Button disabled={busy} onClick={() => submit(undefined, batch.id)}>Resume pending rows</Button>}
      </section>)}
    </main>
  </>;
}
