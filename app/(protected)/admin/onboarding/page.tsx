"use client";
import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getAllEmployees } from "@/lib/actions/employee.actions";
import type { Employee } from "@/lib/types/employee.types";
export default function OnboardingDirectory() {
  const [search, setSearch] = useState(""); const [rows, setRows] = useState<Employee[]>([]);
  const [state, setState] = useState("idle"); const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(0);
  const [appliedSearch, setAppliedSearch] = useState("");
  async function load(nextPage: number, query = appliedSearch) {
    setState("loading"); setRows([]);
    try { const result = await getAllEmployees(nextPage, 10, { search: query }); setRows(result.data); setTotalPages(result.pagination?.totalPages ?? 0); setPage(nextPage); setAppliedSearch(query); setState("ready"); }
    catch { setState("error"); }
  }
  return <><Header breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Onboarding" }]} />
    <div className="p-4 space-y-5"><h1 className="text-3xl font-bold">Manual onboarding</h1>
      <p>Find an existing employee account to manage its checklist. Checklist completion never changes account access or employment decisions.</p>
      <Card><CardHeader><CardTitle>Find employee</CardTitle></CardHeader><CardContent className="space-y-4">
        <form className="flex gap-3" onSubmit={event => { event.preventDefault(); load(1, search.trim()); }}>
          <Input aria-label="Find employee for onboarding" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="Name, email, department or position" />
          <Button disabled={state === 'loading'}>Search employees</Button>
        </form>
        {state === 'loading' && <p role="status">Loading employees…</p>}
        {state === 'error' && <p role="alert">Employee search unavailable. Search again to retry.</p>}
        {state === 'ready' && !rows.length && <p>No matching employee accounts.</p>}
        {rows.map(row => <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3" key={row.id}>
          <div><strong>{row.fullName}</strong><p>{row.email} · Account: {row.status}</p></div>
          <Button asChild variant="outline"><Link href={`/admin/employees/${row.id}/onboarding`}>Open checklist</Link></Button>
        </div>)}
        {state === 'ready' && totalPages > 1 && <div className="flex gap-3 items-center"><Button variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button><span>Page {page} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</Button></div>}
      </CardContent></Card>
      <Button asChild variant="outline"><Link href="/admin/employees/add">Add Employee</Link></Button>
    </div></>;
}
