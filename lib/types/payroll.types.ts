export interface PayrollPeriod {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    payroll_type: "monthly" | "weekly";
    status: "draft" | "reviewed" | "approved" | "paid";
    created_by: number;
    created_at: string;
    creator?: {
        id: number;
        fullName: string;
    };
    payrolls?: EmployeePayroll[];
}

export interface EmployeePayroll {
    currency?: string | null;
    id: number;
    payroll_period_id: number;
    employee_id: number;
    gross_salary: string | number;
    total_deductions: string | number;
    net_salary: string | number;
    status: "draft" | "calculated" | "paid";
    locked: boolean;
    snapshot: PayrollSnapshot;
    created_at: string;
    employee?: {
        id: number;
        fullName: string;
        email: string;
    };
    period?: PayrollPeriod;
}

export interface PayrollAdjustment {
    id: number;
    employee_payroll_id: number;
    type: "bonus" | "penalty" | "correction";
    amount: string | number;
    reason: string;
    created_by: number;
    created_at: string;
}

export interface PayrollResponse<T> {
    success: boolean;
    message: string;
    data: T;
    warning?: string;
}

export interface PayrollSnapshot {
    baseSalary?: number;
    salaryType?: string;
    overtimePay?: number;
    overtimeHours?: number;
    totalBonuses?: number;
    totalAdjustmentPenalties?: number;
    unpaidDeduction?: number;
    unpaidLeaveDays?: number;
    absentDays?: number;
    unaccountedDays?: number;
    latePenalty?: number;
    lateCounts?: number;
    taxAmount?: number;
    taxPercentage?: number;
    totalAttendanceDays?: number;
    totalWorkedHours?: number;
    adjustments?: { type: string; amount: number; reason: string }[];
    [key: string]: unknown;
}

export interface PayrollProfile {
    id: number;
    employee_id: number;
    salary_type: "monthly" | "hourly" | "daily";
    base_salary: string | number;
    standard_working_days: number;
    standard_working_hours: number;
    overtime_eligible: boolean;
    overtime_rate: string | number;
    late_penalty_rule: LatePenaltyRule | null;
    leave_deduction_rule: LeaveDeductionRule | null;
    tax_percentage: string | number;
    created_at: string;
    updated_at: string;
    employee?: {
        id: number;
        fullName: string;
        email: string;
        role?: string;
        status?: string;
    };
}

export interface LatePenaltyRule {
    enabled: boolean;
    penalty_per_late: number;
}

export interface LeaveDeductionRule {
    enabled: boolean;
    deduction_per_day: number;
}

export interface EmployeeWithoutProfile {
    id: number;
    fullName: string;
    email: string;
    role: string;
    status: string;
    salary?: number;
}
