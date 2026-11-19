import { getAuthToken } from "@/lib/auth/token";
import {
    PayrollPeriod,
    EmployeePayroll,
    PayrollResponse,
    PayrollAdjustment,
    PayrollProfile,
    EmployeeWithoutProfile,
} from "@/lib/types/payroll.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api";

const getApiUrl = (endpoint: string) => {
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
    return `${baseUrl}${endpoint}`;
};

const getHeaders = () => {
    const token = getAuthToken();
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

export const createPayrollPeriod = async (data: {
    name: string;
    startDate: string;
    endDate: string;
    payrollType: string;
}): Promise<PayrollResponse<PayrollPeriod>> => {
    const response = await fetch(getApiUrl("payroll/periods"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return response.json();
};

export const getPayrollPeriods = async (): Promise<PayrollResponse<PayrollPeriod[]>> => {
    const response = await fetch(getApiUrl("payroll/periods"), {
        method: "GET",
        headers: getHeaders(),
    });
    return response.json();
};

export const getPayrollPeriodDetails = async (id: number): Promise<PayrollResponse<PayrollPeriod>> => {
    const response = await fetch(getApiUrl(`payroll/period/${id}`), {
        method: "GET",
        headers: getHeaders(),
    });
    return response.json();
};

export const calculatePayroll = async (id: number): Promise<PayrollResponse<EmployeePayroll>> => {
    const response = await fetch(getApiUrl(`payroll/calculate/${id}`), {
        method: "POST",
        headers: getHeaders(),
    });
    return response.json();
};

export const bulkCalculatePayroll = async (periodId: number): Promise<PayrollResponse<{ processed: number }>> => {
    const response = await fetch(getApiUrl(`payroll/calculate-bulk/${periodId}`), {
        method: "POST",
        headers: getHeaders(),
    });
    return response.json();
};


export const addAdjustment = async (data: {
    employee_payroll_id: number;
    type: string;
    amount: number;
    reason: string;
}): Promise<PayrollResponse<PayrollAdjustment>> => {
    const response = await fetch(getApiUrl("payroll/adjustment"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return response.json();
};

export const reviewPayrollPeriod = async (id: number): Promise<PayrollResponse<PayrollPeriod>> => {
    const response = await fetch(getApiUrl(`payroll/period/${id}/review`), {
        method: "PUT",
        headers: getHeaders(),
    });
    return response.json();
};

export const approvePayrollPeriod = async (id: number): Promise<PayrollResponse<PayrollPeriod>> => {
    const response = await fetch(getApiUrl(`payroll/period/${id}/approve`), {
        method: "PUT",
        headers: getHeaders(),
    });
    return response.json();
};

export const markPayrollAsPaid = async (id: number): Promise<PayrollResponse<PayrollPeriod>> => {
    const response = await fetch(getApiUrl(`payroll/period/${id}/pay`), {
        method: "PUT",
        headers: getHeaders(),
    });
    return response.json();
};

export const getEmployeePayrollHistory = async (): Promise<PayrollResponse<EmployeePayroll[]>> => {
    const response = await fetch(getApiUrl("payroll/history"), {
        method: "GET",
        headers: getHeaders(),
    });
    return response.json();
};

export const deletePayrollPeriod = async (id: number): Promise<PayrollResponse<null>> => {
    const response = await fetch(getApiUrl(`payroll/period/${id}`), {
        method: "DELETE",
        headers: getHeaders(),
    });
    return response.json();
};

// Payroll Profile Management
export const getAllPayrollProfiles = async (): Promise<PayrollResponse<PayrollProfile[]>> => {
    const response = await fetch(getApiUrl("payroll/profiles"), {
        method: "GET",
        headers: getHeaders(),
    });
    return response.json();
};

export const getEmployeesWithoutProfiles = async (): Promise<PayrollResponse<EmployeeWithoutProfile[]>> => {
    const response = await fetch(getApiUrl("payroll/profiles/missing"), {
        method: "GET",
        headers: getHeaders(),
    });
    return response.json();
};

export const getPayrollProfile = async (employeeId: number): Promise<PayrollResponse<PayrollProfile>> => {
    const response = await fetch(getApiUrl(`payroll/profile/${employeeId}`), {
        method: "GET",
        headers: getHeaders(),
    });
    return response.json();
};

export const getPayrollProfileById = async (profileId: number): Promise<PayrollResponse<PayrollProfile>> => {
    const response = await fetch(getApiUrl(`payroll/profile/by-id/${profileId}`), {
        method: "GET",
        headers: getHeaders(),
    });
    return response.json();
};

export const createPayrollProfile = async (data: {
    employee_id: number;
    salary_type: string;
    base_salary: number;
    standard_working_days?: number;
    standard_working_hours?: number;
    overtime_eligible?: boolean;
    overtime_rate?: number;
    late_penalty_rule?: unknown;
    leave_deduction_rule?: unknown;
    tax_percentage?: number;
}): Promise<PayrollResponse<PayrollProfile>> => {
    const response = await fetch(getApiUrl("payroll/profile"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return response.json();
};

export const updatePayrollProfile = async (
    id: number,
    data: {
        standard_working_days?: number;
        standard_working_hours?: number;
        overtime_eligible?: boolean;
        overtime_rate?: number;
        late_penalty_rule?: unknown;
        leave_deduction_rule?: unknown;
        tax_percentage?: number;
    }
): Promise<PayrollResponse<PayrollProfile>> => {
    const response = await fetch(getApiUrl(`payroll/profile/${id}`), {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return response.json();
};

export const deletePayrollProfile = async (id: number): Promise<PayrollResponse<null>> => {
    const response = await fetch(getApiUrl(`payroll/profile/${id}`), {
        method: "DELETE",
        headers: getHeaders(),
    });
    return response.json();
};
