"use client";
import {payrollCurrencyTotals} from '@/lib/payroll-currency-totals';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Calculator,
    CheckCircle,
    CreditCard,
    FileCheck,
    Info,
    Loader2,
    MoreHorizontal,
    RefreshCw,
    Search,
    Settings2,
    AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import {
    getPayrollPeriodDetails,
    calculatePayroll,
    bulkCalculatePayroll,
    reviewPayrollPeriod,
    approvePayrollPeriod,
    markPayrollAsPaid,
    addAdjustment
} from "@/lib/actions/payroll.actions";
import { PayrollPeriod, EmployeePayroll } from "@/lib/types/payroll.types";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PayrollStatsCard } from "@/components/payroll/PayrollStatsCard";
import { PayrollBreakdownDialog } from "@/components/payroll/PayrollBreakdownDialog";
import { DollarSign, TrendingDown, TrendingUp, Users } from "lucide-react";

export default function PayrollPeriodDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [period, setPeriod] = useState<PayrollPeriod | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Adjustment Modal State
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);

    // Breakdown Modal State
    const [selectedPayroll, setSelectedPayroll] = useState<EmployeePayroll | null>(null);

    const [adjustmentData, setAdjustmentData] = useState({
        type: "bonus",
        amount: "",
        reason: ""
    });

    const fetchDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await getPayrollPeriodDetails(Number(id));
            if (res.success) {
                setPeriod(res.data);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Failed to load payroll details");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleCalculate = async (payrollId: number) => {
        try {
            setIsProcessing(String(payrollId));
            const res = await calculatePayroll(payrollId);
            if (res.success) {
                toast.success("Recalculation successful");
                fetchDetails();
            } else {
                toast.error(res.message);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to calculate payroll";
            toast.error(errorMessage);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleCalculateAll = async () => {
        if (!period?.id) return;
        try {
            setIsProcessing("all");
            toast.info("Starting optimized bulk calculation...");

            const res = await bulkCalculatePayroll(period.id);

            if (res.success) {
                toast.success(`Bulk calculation finished: processed ${res.data?.processed || 0} records.`);
                fetchDetails();
            } else {
                toast.error(res.message);
            }
        } catch (error: unknown) {
            toast.error("Bulk calculation failed. Please try again.");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleStatusTransition = async (action: 'review' | 'approve' | 'pay') => {
        const periodId = Number(id);
        try {
            setIsProcessing(action);
            let res;
            if (action === 'review') res = await reviewPayrollPeriod(periodId);
            else if (action === 'approve') res = await approvePayrollPeriod(periodId);
            else res = await markPayrollAsPaid(periodId);

            if (res.success) {
                toast.success(`Payroll successfully ${action}ed`);
                fetchDetails();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error(`Failed to ${action} payroll`);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleAddAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayrollId) return;

        try {
            setIsProcessing("adjusting");
            const res = await addAdjustment({
                employee_payroll_id: selectedPayrollId,
                type: adjustmentData.type,
                amount: Number(adjustmentData.amount),
                reason: adjustmentData.reason
            });

            if (res.success) {
                toast.success("Adjustment added successfully");
                setIsAdjustmentModalOpen(false);
                setAdjustmentData({ type: "bonus", amount: "", reason: "" });
                fetchDetails();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Failed to add adjustment");
        } finally {
            setIsProcessing(null);
        }
    };

    const filteredPayrolls = period?.payrolls?.filter(p =>
        p.employee?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.employee?.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "draft": return <Badge variant="secondary">Draft</Badge>;
            case "paid": return <Badge variant="default" className="bg-green-600 font-bold">PAID</Badge>;
            default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
        }
    };

    if (isLoading && !period) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-muted-foreground">Loading details...</p>
            </div>
        );
    }

    if (!period) return <div className="p-8 text-center">Period not found</div>;

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: "Admin", href: "/admin" },
                    { label: "Payroll", href: "/admin/payroll" },
                    { label: period.name },
                ]}
            />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{period.name}</h1>
                            <p className="text-muted-foreground text-sm">
                                Period: {new Date(period.start_date).toLocaleDateString()} to {new Date(period.end_date).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {period.status === "draft" && (
                            <>
                                <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleCalculateAll} disabled={isProcessing !== null}>
                                    {isProcessing === "all" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                                    Verify Reviewed Inputs
                                </Button>
                                <Button className="flex-1 sm:flex-none" onClick={() => handleStatusTransition('review')} disabled={isProcessing !== null}>
                                    {isProcessing === "review" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2" />}
                                    Submit for Review
                                </Button>
                            </>
                        )}
                        {period.status === "reviewed" && (
                            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusTransition('approve')} disabled={isProcessing !== null}>
                                {isProcessing === "approve" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Approve Payroll
                            </Button>
                        )}
                        {period.status === "approved" && (
                            <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={() => handleStatusTransition('pay')} disabled={isProcessing !== null}>
                                {isProcessing === "pay" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                                Mark as Paid
                            </Button>
                        )}
                        {period.status === "paid" && (
                            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 px-4 py-1 text-sm">
                                <CheckCircle className="w-4 h-4 mr-2" /> Payroll Finalized
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <PayrollStatsCard
                        title="Total Gross"
                        value={payrollCurrencyTotals(period.payrolls || [],'gross_salary')}
                        icon={DollarSign}
                        iconColor="text-blue-600"
                    />
                    <PayrollStatsCard
                        title="Total Deductions"
                        value={payrollCurrencyTotals(period.payrolls || [],'total_deductions')}
                        icon={TrendingDown}
                        iconColor="text-red-600"
                    />
                    <PayrollStatsCard
                        title="Net Disbursement"
                        value={payrollCurrencyTotals(period.payrolls || [],'net_salary')}
                        icon={TrendingUp}
                        iconColor="text-green-600"
                    />
                    <PayrollStatsCard
                        title="Employee Count"
                        value={period.payrolls?.length || 0}
                        icon={Users}
                        iconColor="text-purple-600"
                    />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Employee Disbursements</CardTitle>
                                <CardDescription>Individual payroll records for this period.</CardDescription>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search employees..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6">
                        <div className="rounded-md border overflow-x-auto">
                            <Table className="min-w-[700px]">
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Gross Salary</TableHead>
                                        <TableHead className="text-right">Deductions</TableHead>
                                        <TableHead className="text-right font-bold text-foreground">Calculated Salary</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPayrolls?.map((payroll) => (
                                        <TableRow key={payroll.id}>
                                            <TableCell>
                                                <div className="font-semibold">{payroll.employee?.fullName}</div>
                                                <div className="text-xs text-muted-foreground">{payroll.employee?.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(payroll.status)}
                                                {payroll.locked && (
                                                    <span title="Locked">
                                                        <AlertTriangle className="inline-block w-3 h-3 ml-2 text-amber-500" />
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span>{payroll.currency || "Unclassified"} {Number(payroll.gross_salary).toFixed(2)}</span>
                                                    {Number(payroll.snapshot?.totalBonuses || 0) > 0 && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button className="text-green-600">
                                                                        <Info className="h-3 w-3" />
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div className="space-y-1">
                                                                        <p className="font-bold">Bonuses: +{payroll.currency || "Unclassified"} {Number(payroll.snapshot?.totalBonuses).toFixed(2)}</p>
                                                                        {payroll.snapshot?.adjustments?.filter(a => a.type === 'bonus').map((a, i) => (
                                                                            <p key={i} className="text-[10px] opacity-80">- {a.reason}</p>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span>-{payroll.currency || "Unclassified"} {Number(payroll.total_deductions).toFixed(2)}</span>
                                                    {Number(payroll.snapshot?.totalAdjustmentPenalties || 0) > 0 && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button className="text-red-600">
                                                                        <Info className="h-3 w-3" />
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div className="space-y-1">
                                                                        <p className="font-bold">Penalties: -{payroll.currency || "Unclassified"} {Number(payroll.snapshot?.totalAdjustmentPenalties).toFixed(2)}</p>
                                                                        {payroll.snapshot?.adjustments?.filter(a => a.type === 'penalty').map((a, i) => (
                                                                            <p key={i} className="text-[10px] opacity-80">- {a.reason}</p>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600">{payroll.currency || "Unclassified"} {Number(payroll.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={isProcessing === String(payroll.id)}>
                                                            {isProcessing === String(payroll.id) ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <MoreHorizontal className="h-4 w-4" />}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => router.push("/admin/payroll/components/" + payroll.id)}>Component records</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {!payroll.locked && (
                                                            <DropdownMenuItem onClick={() => handleCalculate(payroll.id)}>
                                                                <Calculator className="w-4 h-4 mr-2" /> Verify reviewed inputs
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedPayrollId(payroll.id);
                                                            setIsAdjustmentModalOpen(true);
                                                        }}>
                                                            <Settings2 className="w-4 h-4 mr-2" /> Add Adjustment
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setSelectedPayroll(payroll)}>
                                                            <Info className="w-4 h-4 mr-2" /> View Breakdown
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Adjustment Dialog */}
            <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
                <DialogContent>
                    <form onSubmit={handleAddAdjustment}>
                        <DialogHeader>
                            <DialogTitle>Add Payroll Adjustment</DialogTitle>
                            <DialogDescription>
                                Apply bonuses, penalties, or corrections to this employee&apos;s payroll.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Adjustment Type</Label>
                                <Select value={adjustmentData.type} onValueChange={(v) => setAdjustmentData({ ...adjustmentData, type: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bonus">Bonus (+)</SelectItem>
                                        <SelectItem value="penalty">Penalty (-)</SelectItem>
                                        <SelectItem value="correction">Correction (+/-)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={adjustmentData.amount}
                                    onChange={e => setAdjustmentData({ ...adjustmentData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Reason</Label>
                                <Input
                                    placeholder="e.g. Performance bonus for Feb"
                                    value={adjustmentData.reason}
                                    onChange={e => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAdjustmentModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isProcessing === "adjusting"}>
                                {isProcessing === "adjusting" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Apply Adjustment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Breakdown Dialog */}
            <PayrollBreakdownDialog
                payroll={selectedPayroll}
                open={!!selectedPayroll}
                onOpenChange={(open) => !open && setSelectedPayroll(null)}
                // Admin doesn't necessarily need download from here yet, but we'll provide a dummy or link it
                onDownload={(id) => toast.info("Downloading payslip for admin...")}
            />
        </>
    );
}
