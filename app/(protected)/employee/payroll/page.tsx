"use client";
import {payrollCurrencyTotals} from '@/lib/payroll-currency-totals';

import { useState, useEffect } from "react";
import {
    FileText,
    Download,
    ChevronRight,
    Loader2,
    Wallet,
    TrendingDown,
    TrendingUp,
    Receipt,
    Info
} from "lucide-react";
import { toast } from "sonner";
import { getEmployeePayrollHistory } from "@/lib/actions/payroll.actions";
import { EmployeePayroll } from "@/lib/types/payroll.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PayrollBreakdownDialog } from "@/components/payroll/PayrollBreakdownDialog";
import { EmptyPayrollState } from "@/components/payroll/EmptyPayrollState";
import { PayrollStatsCard } from "@/components/payroll/PayrollStatsCard";

export default function EmployeePayrollPage() {
    const [payrolls, setPayrolls] = useState<EmployeePayroll[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPayroll, setSelectedPayroll] = useState<EmployeePayroll | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await getEmployeePayrollHistory();
                if (res.success) {
                    setPayrolls(res.data);
                }
            } catch (error) {
                toast.error("Failed to load payroll history");
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const handleDownload = (id: number) => {
        toast.info("Payslip generation (PDF) is a placeholder for now.");
        // In production, this would call a PDF generation endpoint
    };

    const lastPaid = payrolls.find(p => p.status === 'paid');

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: "My Profile", href: "/employee/profile" },
                    { label: "Payslips & Salary" },
                ]}
            />

            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Payroll History</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">View your salary breakdowns and download payslips.</p>
                </div>

                {lastPaid && (
                    <Card className="relative overflow-hidden border-none bg-slate-950 text-white shadow-2xl">
                        {/* Decorative Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-600/20" />
                        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
                        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

                        <CardHeader className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <Wallet className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Most Recent Payment</span>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-white">
                                        {lastPaid.period?.name}
                                    </CardTitle>
                                </div>
                                <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-300">
                                    Processed
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="relative z-10">
                            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 py-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-400">Calculated Salary</p>
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                                            {lastPaid.currency || "Unclassified"} {Math.floor(Number(lastPaid.net_salary)).toLocaleString()}
                                        </span>
                                        <span className="text-lg sm:text-xl font-medium text-blue-400">PKR</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
                                    <div className="flex flex-col items-center justify-center rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4 min-w-[100px] sm:min-w-[120px] backdrop-blur-sm relative group flex-1 sm:flex-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross Pay</span>
                                        <span className="text-base sm:text-lg font-bold text-white">{lastPaid.currency || "Unclassified"} {Number(lastPaid.gross_salary).toLocaleString()}</span>
                                        {Number(lastPaid.snapshot?.totalBonuses || 0) > 0 && (
                                            <Badge variant="outline" className="absolute -top-2 -right-2 bg-green-500 text-[8px] h-4 px-1 border-none text-white animate-pulse">
                                                +{Number(lastPaid.snapshot?.totalBonuses).toLocaleString()}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center justify-center rounded-2xl bg-red-500/5 border border-red-500/10 p-3 sm:p-4 min-w-[100px] sm:min-w-[120px] backdrop-blur-sm text-red-400 relative flex-1 sm:flex-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500/70">Deductions</span>
                                        <span className="text-base sm:text-lg font-bold">{lastPaid.currency || "Unclassified"} {Number(lastPaid.total_deductions).toLocaleString()}</span>
                                        {Number(lastPaid.snapshot?.totalAdjustmentPenalties || 0) > 0 && (
                                            <Badge variant="outline" className="absolute -top-2 -right-2 bg-red-600 text-[8px] h-4 px-1 border-none text-white animate-pulse">
                                                -{Number(lastPaid.snapshot?.totalAdjustmentPenalties).toLocaleString()}
                                            </Badge>
                                        )}
                                    </div>
                                    <Button
                                        variant="default"
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 sm:h-16 px-4 sm:px-8 rounded-2xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                                        onClick={() => setSelectedPayroll(lastPaid)}
                                    >
                                        View Breakdown
                                        <ChevronRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <PayrollStatsCard
                        title="Monthly Average"
                        value={payrollCurrencyTotals(payrolls,'net_salary',true)}
                        description={`Based on the last ${payrolls.length} months`}
                        icon={TrendingUp}
                        iconColor="text-green-600"
                    />
                    <PayrollStatsCard
                        title="Total Deductions (YTD)"
                        value={payrollCurrencyTotals(payrolls,'total_deductions')}
                        description="Taxes, penalties & leaves"
                        icon={TrendingDown}
                        iconColor="text-red-600"
                    />
                    <PayrollStatsCard
                        title="Next Expected Payroll"
                        value="TBA"
                        description="Pending cycle generation"
                        icon={Receipt}
                        iconColor="text-blue-600"
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Payslips History</CardTitle>
                        <CardDescription>Click on a row to view full salary breakdown.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p>Fetching your payroll records...</p>
                            </div>
                        ) : payrolls.length === 0 ? (
                            <EmptyPayrollState
                                icon={FileText}
                                title="No payroll history found"
                                description="Contact HR if you believe this is an error."
                            />
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table className="min-w-[700px]">
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Payroll Period</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Gross</TableHead>
                                            <TableHead className="text-right">Deductions</TableHead>
                                            <TableHead className="text-right font-bold text-foreground">Calculated Salary</TableHead>
                                            <TableHead className="text-center">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payrolls.map((p) => (
                                            <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedPayroll(p)}>
                                                <TableCell className="font-medium">
                                                    {p.period?.name}
                                                    <div className="text-xs font-normal text-muted-foreground">
                                                        {p.period?.start_date} - {p.period?.end_date}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={p.status === 'paid' ? 'default' : 'secondary'} className={p.status === 'paid' ? 'bg-green-600' : ''}>
                                                        {p.status.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span>{p.currency || "Unclassified"} {Number(p.gross_salary).toFixed(0)}</span>
                                                        {Number(p.snapshot?.totalBonuses || 0) > 0 && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            className="text-green-600"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedPayroll(p);
                                                                            }}
                                                                        >
                                                                            <Info className="h-3 w-3" />
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold">Bonuses: +{p.currency || "Unclassified"} {Number(p.snapshot?.totalBonuses).toFixed(2)}</p>
                                                                            {p.snapshot?.adjustments?.filter(a => a.type === 'bonus').map((a, i) => (
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
                                                        <span>-{p.currency || "Unclassified"} {Number(p.total_deductions).toFixed(0)}</span>
                                                        {Number(p.snapshot?.totalAdjustmentPenalties || 0) > 0 && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            className="text-red-600"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedPayroll(p);
                                                                            }}
                                                                        >
                                                                            <Info className="h-3 w-3" />
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold">Penalties: -{p.currency || "Unclassified"} {Number(p.snapshot?.totalAdjustmentPenalties).toFixed(2)}</p>
                                                                            {p.snapshot?.adjustments?.filter(a => a.type === 'penalty').map((a, i) => (
                                                                                <p key={i} className="text-[10px] opacity-80">- {a.reason}</p>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-green-600">{p.currency || "Unclassified"} {Math.floor(Number(p.net_salary)).toLocaleString()}</TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="outline" size="sm" onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownload(p.id);
                                                    }}>
                                                        <Download className="w-4 h-4 mr-2" /> Payslip
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Breakdown Dialog */}
            <PayrollBreakdownDialog
                payroll={selectedPayroll}
                open={!!selectedPayroll}
                onOpenChange={(open) => !open && setSelectedPayroll(null)}
                onDownload={handleDownload}
            />
        </>
    );
}
