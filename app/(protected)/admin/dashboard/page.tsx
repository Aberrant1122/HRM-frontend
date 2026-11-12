"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeeAccountSummary } from "@/lib/actions/employee.actions";
import { getAuthToken } from "@/lib/auth/token";
import type { EmployeeAccountSummary } from "@/lib/types/employee.types";
import { WorkforceOverview } from '@/components/workforce-overview';

type AccountActivity = {
  date: string;
  attendance: { accountsWithRecords: number; distinctAccountsByRecordedStatus: Record<string, number> };
  approvedLeaveAccounts: number;
  pendingLeaveRequests: number;
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState<EmployeeAccountSummary | null>(null);
  const [summaryState, setSummaryState] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [dateInput, setDateInput] = useState("");
  const [report, setReport] = useState<{ date: string; version: number } | null>(null);
  const [activity, setActivity] = useState<AccountActivity | null>(null);
  const [activityState, setActivityState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  useEffect(() => {
    let cancelled = false;
    setSummaryState("loading"); setSummary(null);
    getEmployeeAccountSummary().then(value => {
      if (!cancelled) { setSummary(value); setSummaryState("ready"); }
    }).catch(() => { if (!cancelled) setSummaryState("error"); });
    return () => { cancelled = true; };
  }, [reload]);
  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    setActivity(null); setActivityState("loading");
    const params = new URLSearchParams({ date: report.date });
    const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api").replace(/\/$/, "");
    fetch(`${base}/dashboard/account-activity?${params}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }, cache: "no-store",
    }).then(async response => {
      if (!response.ok) throw new Error("Unavailable");
      const payload = await response.json();
      if (!payload.success || payload.data?.date !== report.date) throw new Error("Invalid response");
      if (!cancelled) { setActivity(payload.data); setActivityState("ready"); }
    }).catch(() => { if (!cancelled) setActivityState("error"); });
    return () => { cancelled = true; };
  }, [report]);
  const value = (count?: number) => count ?? (summaryState === "error" ? "Unavailable" : "…");
  const cards = [
    ["Employee accounts", summary?.counts.total, "All account statuses; all pages"],
    ["Active accounts", summary?.counts.active, "Account access enabled"],
    ["Inactive accounts", summary?.counts.inactive, `Suspended: ${summary?.counts.suspended ?? "…"}; unknown: ${summary?.counts.unknown ?? "…"}`],
    ["Configured departments", summary?.departments.activeConfigurations, "Active department configurations"],
  ] as const;
  return <>
    <Header breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Dashboard" }]} />
    <main className="flex flex-1 flex-col gap-6 p-4">
      <div><h1 className="text-3xl font-bold">Workforce and account overview</h1>
        <p className="text-muted-foreground mt-2">Employee logins and HR accounts with preserved employee membership, across all pages and statuses. Account access state does not define employment or leave.</p></div>
      <WorkforceOverview />
      <h2 className="text-xl font-semibold">Account access overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(([label, count, description]) => <Card key={label}>
          <CardHeader><CardTitle className="text-sm font-medium">{label}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{value(count)}</div><p className="text-xs text-muted-foreground mt-2">{description}</p></CardContent>
        </Card>)}
      </div>
      {summaryState === "error" && <div role="alert">Account summary unavailable. <Button variant="outline" onClick={() => setReload(value => value + 1)}>Retry account summary</Button></div>}
      <Card>
        <CardHeader><CardTitle>Recorded activity by date</CardTitle>
          <CardDescription>Choose a calendar date. These are records for employee accounts including preserved HR membership, inactive and suspended accounts.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
            event.preventDefault(); setReport(value => ({ date: dateInput, version: (value?.version ?? 0) + 1 }));
          }}>
            <label className="grid gap-1 text-sm" htmlFor="activity-date">Report date
              <Input id="activity-date" type="date" min="1000-01-01" max="9999-12-31" required value={dateInput} onChange={event => setDateInput(event.target.value)} />
            </label><Button type="submit">Load activity</Button>
          </form>
          {activityState === "idle" && <p>Select a report date to load attendance and approved leave records.</p>}
          {activityState === "loading" && <p role="status">Loading activity…</p>}
          {activityState === "error" && <div role="alert">Activity unavailable. <Button variant="outline" onClick={() => setReport(value => value && { ...value, version: value.version + 1 })}>Retry activity</Button></div>}
          {activity && <section aria-label="Activity results" className="space-y-4">
            <h2 className="font-semibold">Recorded activity for {activity.date}</h2>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><dt>Accounts with attendance records</dt><dd className="text-2xl font-bold">{activity.attendance.accountsWithRecords}</dd></div>
              <div><dt>Accounts with approved leave</dt><dd className="text-2xl font-bold">{activity.approvedLeaveAccounts}</dd></div>
              <div><dt>Pending leave requests (all dates)</dt><dd className="text-2xl font-bold">{activity.pendingLeaveRequests}</dd></div>
            </dl>
            <p className="text-sm text-muted-foreground">Approved leave counts each account once when a request covers this date, including half-day requests. Pending requests are counted as requests across all dates.</p>
            <h3 className="font-medium">Distinct accounts by recorded attendance status</h3>
            <dl className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(activity.attendance.distinctAccountsByRecordedStatus).map(([status, count]) => <div key={status}><dt>{status}</dt><dd className="font-bold">{count}</dd></div>)}
            </dl>
            <p className="text-sm text-muted-foreground">An account with conflicting records can appear in several status groups. Missing records do not establish absence. These counts are not an attendance rate or employment headcount.</p>
          </section>}
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link href="/admin/employees">Manage Employee Information</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/attendance">View Attendance Records</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/leave/requests">Review Leave Requests</Link></Button>
          <Button asChild><Link href="/admin/employees/add">Add Employee</Link></Button>
        </CardContent></Card>
    </main>
  </>;
}
