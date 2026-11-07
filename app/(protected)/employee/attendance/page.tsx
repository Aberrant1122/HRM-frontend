"use client";

import { useEffect, useState, useRef } from "react";
import {
  CheckCircle2,
  History,
} from "lucide-react";
import { parseISO } from "date-fns";
import { toast } from "sonner";
import useSWR, { SWRConfig, useSWRConfig } from "swr";
import { useAuth } from '@/context/AuthContext';
import { getAuthToken } from "@/lib/auth/token";
import { handleAuthExpiration } from "@/lib/auth/handleAuthExpiration";
import { Header } from "@/components/header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  clockInAction,
  clockOutAction,
  getTodaysAttendance,
} from "@/lib/actions/attendance.actions";
import { WeeklyAttendanceRecord as BackendWeeklyRecord } from "@/lib/types/attendance.types";
import { AttendanceHistoryTable } from "@/components/attendance/AttendanceHistoryTable";
import { LiveClockCard } from "@/components/attendance/LiveClockCard";
import { SummaryCards } from "@/components/attendance/SummaryCards";
import { AttendanceActionCard } from "@/components/attendance/AttendanceActionCard";
import { FilterBar } from "@/components/attendance/FilterBar";
import { CheckoutForm } from "@/components/attendance/CheckoutForm";
import { AttendanceRetry } from '@/components/attendance/AttendanceRetry';

const fetcher = async (url: string) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      handleAuthExpiration("Session expired");
      throw new Error("Session expired");
    }
    const error = new Error("An error occurred while fetching the data.");
    const errorData = await res.json().catch(() => ({}));
    error.message = errorData.message || error.message;
    throw error;
  }

  return res.json();
};

export default function EmployeeAttendancePage() {
  const { token } = useAuth();
  return <SWRConfig key={token || 'signed-out'} value={{ provider: () => new Map() }}><EmployeeAttendanceContent /></SWRConfig>;
}
function EmployeeAttendanceContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState<
    "not_checked_in" | "checked_in" | "checked_out"
  >("not_checked_in");
  const [isLoading, setIsLoading] = useState(true);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [workingHours, setWorkingHours] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [filterDate, setFilterDate] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const isFetchedRef = useRef(false);

  const { mutate: globalMutate } = useSWRConfig();


  const {
    data: weeklyData,
    error: weeklyError,
    isLoading: isLoadingHistory,
    mutate: mutateWeeklyData,
  } = useSWR<{
    success: boolean;
    data: BackendWeeklyRecord[];
    startDate: string;
    endDate: string;
    summary: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
      totalHours: string;
      formattedTotalHours: string;
    };
  }>(
    `${(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api").replace(/\/$/, "")}/attendance/weekly`,
    fetcher,
    {
      refreshInterval: 300000,
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      dedupingInterval: 10000,
    }
  );

  const {
    data: historyData,
    error: historyError,
    isLoading: isLoadingHistoryData,
    mutate: mutateHistoryData,
  } = useSWR<{
    success: boolean;
    data: BackendWeeklyRecord[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
  }>(
    `${(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api").replace(/\/$/, "")}/attendance/history?page=${historyPage}&limit=${historyLimit}${filterDate ? `&date=${filterDate}` : ""}${historyStatus !== "all" ? `&status=${historyStatus}` : ""}${searchQuery ? `&search=${searchQuery}` : ""}`,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  useEffect(() => {
    if (!weeklyError) return;
    console.error("Error fetching attendance history:", weeklyError);
    toast.error(weeklyError.message || "Failed to load attendance history");
  }, [weeklyError]);

  useEffect(() => {
    if (isFetchedRef.current) return;

    const checkAttendanceStatus = async () => {
      try {
        setIsLoading(true);
        isFetchedRef.current = true;

        const token = getAuthToken();
        if (!token) {
          throw new Error("No authentication token found");
        }

        const { data: attendance, error } = await getTodaysAttendance(token);

        if (error) {
          console.error("Error in getTodaysAttendance:", error);
          throw new Error(error);
        }

        mutateWeeklyData();

        if (attendance?.clockIn && !attendance.clockOut) {
          const checkInDateTime = parseISO(attendance.clockIn);
          const now = new Date();
          const diffHours =
            (now.getTime() - checkInDateTime.getTime()) / (1000 * 60 * 60);

          setAttendanceStatus("checked_in");
          setCheckInTime(checkInDateTime);
          setWorkingHours(parseFloat(diffHours.toFixed(2)));
        } else if (attendance?.clockIn && attendance.clockOut) {
          setAttendanceStatus("checked_out");
          setCheckInTime(parseISO(attendance.clockIn));
          const checkOutDateTime = parseISO(attendance.clockOut);
          const diffHours =
            (checkOutDateTime.getTime() -
              parseISO(attendance.clockIn).getTime()) /
            (1000 * 60 * 60);
          setWorkingHours(parseFloat(diffHours.toFixed(2)));
        } else {
          setAttendanceStatus("not_checked_in");
          setCheckInTime(null);
          setWorkingHours(0);
        }
      } catch (error: unknown) {
        console.error("Error checking attendance status:", error);
        setAttendanceStatus("not_checked_in");
        setCheckInTime(null);
        setWorkingHours(0);
      } finally {
        setIsLoading(false);
      }
    };

    checkAttendanceStatus();
  }, [mutateWeeklyData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (checkInTime) {
        const diff =
          (new Date().getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        setWorkingHours(parseFloat(diff.toFixed(2)));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [checkInTime]);

  const handleCheckIn = async () => {
    if (isActionInProgress) return;

    const token = getAuthToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    if (!weeklyData) return;

    try {
      setIsActionInProgress(true);

      // Render committed server facts; do not invent work hours during a save.

      const { data, error, status } = await clockInAction(token);

      if (error || status === 401) {
        throw new Error(error || "Authentication failed. Please log in again.");
      }

      if (data?.attendance) {
        const { clockIn } = data.attendance;
        const checkInDate = parseISO(clockIn);

        setCheckInTime(checkInDate);
        setAttendanceStatus("checked_in");

        await Promise.all([
          globalMutate(
            (key) => typeof key === "string" && key.includes("/attendance/")
          ),
          mutateWeeklyData(),
        ]);

        toast.success("Checked in successfully!", {
          description: `You've started your day at ${clockIn}`,
        });
      }
    } catch (error) {
      await mutateWeeklyData();
      const err = error as Error;
      console.error("Check-in error details:", {
        message: err.message,
        name: err.name,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });

      if (err.message.includes("401") || err.message.includes("Unauthorized")) {
        handleAuthExpiration("Session expired");
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to check in. Please try again.";
        toast.error("Check-in failed", {
          description: errorMessage,
        });
      }
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleCheckOutClick = () => {
    setShowCheckoutForm(true);
  };

  const handleCheckOut = async (checkoutData: {
    taskId?: number;
    taskStatus?: "planning" | "in-progress" | "testing" | "blocked" | "completed";
    workNote?: string;
    deliverableLink?: string;
    deliverables?: File[];
  }) => {
    if (isActionInProgress) return;

    const token = getAuthToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    if (!weeklyData) return;

    try {
      setIsActionInProgress(true);

      // Render committed server facts; do not invent work hours during a save.

      const { data, error } = await clockOutAction(token, checkoutData);

      if (error) throw new Error(error);

      setAttendanceStatus("checked_out");
      setCheckInTime(null);
      setWorkingHours(0);
      setShowSuccess(true);

      await Promise.all([
        globalMutate(
          (key) => typeof key === "string" && key.includes("/attendance/")
        ),
        mutateWeeklyData(),
      ]);

      if (data?.attendance) {
        toast.success("Checked out successfully!", {
          description: `You've worked for ${data.attendance.totalHours} today.`,
        });
      }

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      await mutateWeeklyData();
      const err = error as Error;
      console.error("Check-out error:", err);
      toast.error(err.message.includes('unconfirmed') ? 'Attendance confirmation pending' : "Check-out failed", {
        description: err.message || "Failed to check out. Please try again.",
      });
      throw error;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleFilterDateChange = (value: string) => {
    setFilterDate(value);
    setHistoryPage(1);
  };

  const handleStatusChange = (value: string) => {
    setHistoryStatus(value);
    setHistoryPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setHistoryPage(1);
  };

  const handleClearFilters = () => {
    setFilterDate("");
    setHistoryStatus("all");
    setSearchQuery("");
    setHistoryPage(1);
  };

  const handleExport = () => {
    toast.info("Exporting...", {
      description: "Your attendance data is being exported as CSV.",
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AttendanceRetry />
      <Header
        breadcrumbs={[
          { label: "Employee", href: "/employee" },
          { label: "Attendance" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Attendance
          </h1>
          <p className="mt-1 text-sm sm:text-base text-gray-500">
            Track your work hours and attendance
          </p>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 font-medium">
                {attendanceStatus === "checked_in"
                  ? "Successfully checked in!"
                  : "Successfully checked out!"}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="space-y-6">
          {/* Live Clock Card */}
          <LiveClockCard
            currentTime={currentTime}
            attendanceStatus={attendanceStatus}
          />

          {/* Summary KPI Cards */}
          <SummaryCards
            workingHours={workingHours}
            checkInTime={checkInTime}
          />

          {/* Attendance Action */}
          <AttendanceActionCard
            attendanceStatus={attendanceStatus}
            isActionInProgress={isActionInProgress}
            checkInTime={checkInTime}
            workingHours={workingHours}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOutClick}
          />

          {/* Attendance History */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <History className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Attendance History
                  </h3>
                  <p className="text-xs text-gray-500">
                    Your all-time attendance records
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <FilterBar
                  filterDate={filterDate}
                  historyStatus={historyStatus}
                  searchQuery={searchQuery}
                  onDateChange={handleFilterDateChange}
                  onStatusChange={handleStatusChange}
                  onSearchChange={handleSearchChange}
                  onClear={handleClearFilters}
                  onExport={handleExport}
                />
              </div>

              <AttendanceHistoryTable
                data={historyData?.data?.map((record) => ({
                  ...record,
                  id: record.id?.toString() || "",
                  formattedHours: record.formattedHours || "0h 0m",
                }))}
                isLoading={isLoadingHistoryData}
                error={historyError}
                page={historyPage}
                totalPages={historyData?.pagination?.totalPages || 1}
                onPageChange={setHistoryPage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Form Dialog */}
      <CheckoutForm
        open={showCheckoutForm}
        onOpenChange={setShowCheckoutForm}
        onCheckout={handleCheckOut}
      />
    </div>
  );
}
