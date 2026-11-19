"use client";

import { Download, Info, Calendar, Clock, Briefcase, AlertCircle, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmployeePayroll, PayrollSnapshot } from "@/lib/types/payroll.types";

interface PayrollBreakdownDialogProps {
    payroll: EmployeePayroll | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDownload: (id: number) => void;
}

export function PayrollBreakdownDialog({
    payroll,
    open,
    onOpenChange,
    onDownload,
}: PayrollBreakdownDialogProps) {
    if (!payroll) return null;

    // Handle case where snapshot might be stringified (comes from DB as JSON string in some setups)
    const snapshot = (typeof payroll.snapshot === 'string'
        ? JSON.parse(payroll.snapshot)
        : payroll.snapshot) as PayrollSnapshot;

    const standardDays = Number(snapshot?.standardWorkingDays || 22);
    const baseSalary = Number(snapshot?.baseSalary || 0);

    const bonuses = snapshot?.adjustments?.filter((adj) => adj.type === 'bonus') || [];
    const penalties = snapshot?.adjustments?.filter((adj) => adj.type === 'penalty' || (adj.type === 'correction' && Number(adj.amount) < 0)) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
                {/* Header Section */}
                <div className="bg-slate-50 px-6 py-5 border-b">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>Pay Period: {payroll.period?.name}</span>
                        </div>
                        <DialogTitle className="text-xl font-semibold text-slate-900">
                            Salary Statement
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Detailed breakdown of earnings and deductions for this period
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Attendance Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-white border rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-xs text-slate-500">Present</span>
                            </div>
                            <p className="text-lg font-semibold text-slate-700">
                                {snapshot?.totalAttendanceDays || 0}
                            </p>
                            <p className="text-[10px] text-slate-400">days</p>
                        </div>
                        <div className="bg-white border rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-xs text-slate-500">Hours</span>
                            </div>
                            <p className="text-lg font-semibold text-slate-700">
                                {Number(snapshot?.totalWorkedHours || 0).toFixed(1)}
                            </p>
                            <p className="text-[10px] text-slate-400">worked</p>
                        </div>
                        <div className="bg-white border rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-xs text-slate-500">OT</span>
                            </div>
                            <p className="text-lg font-semibold text-emerald-600">
                                {Number(snapshot?.overtimeHours || 0).toFixed(1)}
                            </p>
                            <p className="text-[10px] text-slate-400">hours</p>
                        </div>
                        <div className="bg-white border rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs text-slate-500">Late</span>
                            </div>
                            <p className="text-lg font-semibold text-amber-600">
                                {snapshot?.lateCounts || 0}
                            </p>
                            <p className="text-[10px] text-slate-400">occurrences</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Earnings Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </div>
                            <h4 className="font-semibold text-slate-900">Earnings</h4>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-sm text-slate-600">Base Salary ({snapshot?.salaryType})</span>
                                <span className="text-sm font-medium text-slate-900">
                                    {payroll.currency || "Unclassified"} {baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            
                            {Number(snapshot?.overtimePay || 0) > 0 && (
                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-sm text-slate-600">Overtime Pay</span>
                                    <span className="text-sm font-medium text-emerald-600">
                                        +{payroll.currency || "Unclassified"} {Number(snapshot?.overtimePay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            
                            {bonuses.map((adj, idx: number) => (
                                <div key={`bonus-${idx}`} className="flex justify-between items-center py-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">Bonus</span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                                        <Info className="h-3.5 w-3.5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p className="text-xs">{adj.reason || "No reason provided"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <span className="text-sm font-medium text-emerald-600">
                                        +{payroll.currency || "Unclassified"} {Number(adj.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                            <span className="font-semibold text-slate-900">Gross Earnings</span>
                            <span className="font-semibold text-slate-900">
                                {payroll.currency || "Unclassified"} {Number(payroll.gross_salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <Separator />

                    {/* Deductions Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            </div>
                            <h4 className="font-semibold text-slate-900">Deductions</h4>
                        </div>
                        
                        <div className="space-y-2">
                            {Number(snapshot?.unpaidLeaveDays || 0) > 0 && (
                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-sm text-slate-600">
                                        Unpaid Leave ({snapshot?.unpaidLeaveDays} days)
                                    </span>
                                    <span className="text-sm font-medium text-red-600">
                                        -{payroll.currency || "Unclassified"} {(Number(snapshot?.unpaidLeaveDays || 0) * (baseSalary / standardDays)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            
                            {Number(snapshot?.absentDays || 0) > 0 && (
                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-sm text-slate-600">
                                        Absent Days ({snapshot?.absentDays} days)
                                    </span>
                                    <span className="text-sm font-medium text-red-600">
                                        -{payroll.currency || "Unclassified"} {(Number(snapshot?.absentDays) * (baseSalary / standardDays)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            
                            {Number(snapshot?.unaccountedDays || 0) > 0 && (
                                <div className="flex justify-between items-center py-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">
                                            Missing Days ({snapshot?.unaccountedDays} days)
                                        </span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button className="text-slate-400 hover:text-slate-600">
                                                        <Info className="h-3.5 w-3.5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <p className="text-xs max-w-[200px]">Days without attendance or leave records within working schedule.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <span className="text-sm font-medium text-red-600">
                                        -{payroll.currency || "Unclassified"} {(Number(snapshot?.unaccountedDays) * (baseSalary / standardDays)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            
                            {Number(snapshot?.latePenalty || 0) > 0 && (
                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-sm text-slate-600">
                                        Late Penalty ({snapshot?.lateCounts || 0} occurrences)
                                    </span>
                                    <span className="text-sm font-medium text-red-600">
                                        -{payroll.currency || "Unclassified"} {Number(snapshot?.latePenalty || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            
                            {Number(snapshot?.taxAmount || 0) > 0 && (
                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-sm text-slate-600">Tax ({snapshot?.taxPercentage || 0}%)</span>
                                    <span className="text-sm font-medium text-red-600">
                                        -{payroll.currency || "Unclassified"} {Number(snapshot?.taxAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            
                            {penalties.map((adj, idx: number) => (
                                <div key={`penalty-${idx}`} className="flex justify-between items-center py-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">{adj.type === 'penalty' ? 'Penalty' : 'Adjustment'}</span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button className="text-slate-400 hover:text-slate-600">
                                                        <Info className="h-3.5 w-3.5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p className="text-xs">{adj.reason || "No reason provided"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <span className="text-sm font-medium text-red-600">
                                        -{payroll.currency || "Unclassified"} {Math.abs(Number(adj.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                            <span className="font-semibold text-slate-900">Total Deductions</span>
                            <span className="font-semibold text-red-600">
                                -{payroll.currency || "Unclassified"} {Number(payroll.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Net Payable */}
                    <div className="bg-slate-900 rounded-xl p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <Wallet className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-300">Net Take Home</p>
                                    <p className="text-xs text-slate-400">After all deductions</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl sm:text-3xl font-bold">
                                    {payroll.currency || "Unclassified"} {Number(payroll.net_salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex-col-reverse sm:flex-row gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                        Close
                    </Button>
                    <Button onClick={() => onDownload(payroll.id)} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800">
                        <Download className="w-4 h-4 mr-2" />
                        Download Payslip
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
