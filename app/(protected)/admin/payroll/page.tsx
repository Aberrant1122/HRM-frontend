"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Calendar,
    ChevronRight,
    Loader2,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getPayrollPeriods, createPayrollPeriod, deletePayrollPeriod } from "@/lib/actions/payroll.actions";


import { PayrollPeriod } from "@/lib/types/payroll.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Header } from "@/components/header";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PayrollStatsCard } from "@/components/payroll/PayrollStatsCard";
import { EmptyPayrollState } from "@/components/payroll/EmptyPayrollState";
import { PayrollPeriodCard } from "@/components/payroll/PayrollPeriodCard";

export default function PayrollDashboardPage() {
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleDeletePeriod = async (id: number) => {
        if (!confirm("Are you sure you want to delete this payroll period? This will also delete all associated employee payroll records.")) return;

        try {
            const res = await deletePayrollPeriod(id);
            if (res.success) {
                toast.success("Payroll period deleted successfully");
                fetchPeriods();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Failed to delete payroll period");
        }
    };

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        startDate: "",
        endDate: "",
        payrollType: "monthly"
    });

    const fetchPeriods = async () => {
        try {
            setIsLoading(true);
            const res = await getPayrollPeriods();
            if (res.success) {
                setPeriods(res.data);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Failed to load payroll periods");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const res = await createPayrollPeriod(formData);
            if (res.success) {
                toast.success("Payroll period generated successfully");

                // Show warning if some employees were skipped
                if (res.warning) {
                    toast.warning(res.warning, { duration: 6000 });
                }

                setIsCreateDialogOpen(false);
                setFormData({ name: "", startDate: "", endDate: "", payrollType: "monthly" });
                fetchPeriods();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("An error occurred while generating payroll");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "draft": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
            case "reviewed": return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50"><Clock className="w-3 h-3 mr-1" /> Reviewed</Badge>;
            case "approved": return <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
            case "paid": return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredPeriods = periods.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: "Admin", href: "/admin" },
                    { label: "Payroll Management" },
                ]}
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Payroll Dashboard</h1><Link href="/admin/attendance/calculations" className="underline">Reviewed attendance calculations</Link><Link href="/admin/payroll/settlement-handoffs" className="underline">My settlement handoffs</Link><Link href="/admin/payroll/advances" className="underline">Salary advances and loans</Link>
                        <p className="text-muted-foreground">Manage payroll periods and employee disbursements.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" asChild className="w-full sm:w-auto">
                            <Link href="/admin/payroll/profiles">
                                Manage Profiles
                            </Link>
                        </Button>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full sm:w-auto">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Generate Payroll
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <form onSubmit={handleCreatePeriod}>
                                    <DialogHeader>
                                        <DialogTitle>Generate New Payroll Period</DialogTitle>
                                        <DialogDescription>
                                            Create an empty draft payroll period. Add eligible accounts through Reviewed attendance calculations with an explicit baseline.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Period Name</Label>
                                            <Input
                                                id="name"
                                                placeholder="e.g. February 2026 Payroll"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="startDate">Start Date</Label>
                                                <Input
                                                    id="startDate"
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="endDate">End Date</Label>
                                                <Input
                                                    id="endDate"
                                                    type="date"
                                                    value={formData.endDate}
                                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="type">Payroll Type</Label>
                                            <Select
                                                defaultValue="monthly"
                                                onValueChange={v => setFormData({ ...formData, payrollType: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">Monthly</SelectItem>
                                                    <SelectItem value="weekly">Weekly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <PayrollStatsCard
                        title="Pending Approvals"
                        value={periods.filter(p => p.status === 'reviewed').length}
                        description="Periods waiting for admin sign-off"
                        icon={Clock}
                        iconColor="text-blue-600"
                    />
                    <PayrollStatsCard
                        title="Draft Periods"
                        value={periods.filter(p => p.status === 'draft').length}
                        description="Periods in calculation phase"
                        icon={FileText}
                        iconColor="text-amber-600"
                    />
                    <PayrollStatsCard
                        title="Paid this Month"
                        value={periods.filter(p => p.status === 'paid').length}
                        description="Successfully disbursed periods"
                        icon={CheckCircle2}
                        iconColor="text-green-600"
                    />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Payroll History</CardTitle>
                                <CardDescription>View and manage historical payroll periods.</CardDescription>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search periods..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p>Loading payroll periods...</p>
                            </div>
                        ) : filteredPeriods.length === 0 ? (
                            <EmptyPayrollState
                                icon={Calendar}
                                title="No payroll periods found"
                                description="Generate your first payroll period to get started."
                            />
                        ) : (
                            <div className="space-y-4">
                                {filteredPeriods.map((period) => (
                                    <PayrollPeriodCard
                                        key={period.id}
                                        period={period}
                                        href={`/admin/payroll/${period.id}`}
                                        onDelete={handleDeletePeriod}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
