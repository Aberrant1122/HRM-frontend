export interface AttendanceData {
  id: number;
  date: string;
  clockIn: string;
  clockOut: string | null;
  totalHours?: string;
  status: string;
}

export interface ClockInResponse {
  message: string;
  attendance: Omit<AttendanceData, "clockOut" | "totalHours"> & {
    clockIn: string;
  };
}

export interface ClockOutResponse {
  message: string;
  attendance: AttendanceData & {
    clockOut: string;
    totalHours: string;
  };
}

export interface AttendanceRecord {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: string | null;
  formattedHours: string | null;
  status: string;
}

export interface AllAttendanceResponse {
  success: boolean;
  date: string;
  count: number;
  data: Array<{
    id: number;
    userId: number;
    fullName: string;
    email: string;
    date: string;
    clockIn: string | null;
    clockOut: string | null;
    status: string;
    recordState?: string;
    records?: Array<{ id: number; status: string }>;
  }>;
}

export interface WeeklyAttendanceRecord {
  id?: number;
  date: string;
  day: string;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number;
  formattedHours: string;
}

export interface WeeklyAttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalHours: string;
  formattedTotalHours: string;
}

export interface WeeklyAttendanceResponse {
  success: boolean;
  startDate: string;
  endDate: string;
  summary: WeeklyAttendanceSummary;
  data: WeeklyAttendanceRecord[];
}

export interface AttendanceError {
  error: string;
  message?: string;
}
