export interface LeaveType {
    id: number;
    name: string;
    is_paid: boolean;
    annual_quota: number;
    requires_approval: boolean;
    max_consecutive_days: number | null;
    half_day_allowed: boolean;
    status: "active" | "inactive";
    createdAt?: string;
    updatedAt?: string;
}

export interface LeaveRequest {
    id: number;
    version: number;
    userId: number;
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    totalDays: number;
    leaveMode: "full-day" | "half-day";
    reason: string;
    status: "pending" | "approved" | "rejected";
    approvedBy?: number | null;
    rejectionReason?: string | null;
    createdAt?: string;
    updatedAt?: string;
    user?: {
        id: number;
        fullName: string;
        email: string;
        userInfo?: {
            department: string;
            position: string;
        };
    };
    leaveType?: {
        id: number;
        name: string;
        is_paid: boolean;
    };
}

export interface LeaveResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}
