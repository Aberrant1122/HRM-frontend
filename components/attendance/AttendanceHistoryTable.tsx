import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { StatusBadge } from "@/components/attendance/StatusBadge";
import { cn } from "@/lib/utils";

interface WeeklyAttendanceRecord {
  id: string;
  date: string;
  day: string;
  clockIn: string | null;
  clockOut: string | null;
  formattedHours: string;
  status: string;
}

interface AttendanceHistoryTableProps {
  data: WeeklyAttendanceRecord[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const formatTime = (timeString: string) => {
  if (!timeString) return "-";
  const date = new Date(timeString);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  const [hours, minutes] = timeString.split(":");
  if (hours && minutes) {
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  }
  return timeString;
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function AttendanceHistoryTable({
  data,
  isLoading,
  error,
  page,
  totalPages,
  onPageChange,
}: AttendanceHistoryTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span className="ml-1 text-gray-300">&#8597;</span>;
    return <span className="ml-1 text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th
                className="px-3 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-gray-700"
                onClick={() => handleSort("date")}
              >
                Date <SortIcon column="date" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">
                Day
              </th>
              <th
                className="px-3 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-gray-700"
                onClick={() => handleSort("clockIn")}
              >
                In <SortIcon column="clockIn" />
              </th>
              <th
                className="px-3 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-gray-700"
                onClick={() => handleSort("clockOut")}
              >
                Out <SortIcon column="clockOut" />
              </th>
              <th
                className="px-3 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-gray-700"
                onClick={() => handleSort("hours")}
              >
                Hours <SortIcon column="hours" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  {Array.from({ length: 6 }).map((_, cellIdx) => (
                    <td key={cellIdx} className="px-3 sm:px-4 py-3">
                      <div className={cn("h-3 rounded bg-gray-100", cellIdx === 0 ? "w-24" : cellIdx === 5 ? "w-20" : "w-16")} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data && data.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {data.map((record, index) => (
                  <motion.tr
                    key={`${record.id || "no-id"}-${record.date}-${index}`}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className={cn(
                      "transition-colors hover:bg-blue-50/40 cursor-default",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    )}
                  >
                    <td className="px-3 sm:px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {new Date(record.date + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600">{record.day}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className="text-sm text-gray-700 whitespace-nowrap">
                        {record.clockIn ? formatTime(record.clockIn) : "-"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className="text-sm text-gray-700 whitespace-nowrap">
                        {record.clockOut ? formatTime(record.clockOut) : "-"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {record.formattedHours}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <StatusBadge status={record.status} />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 sm:py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {error ? "Error loading records" : "No attendance records found"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {error
                        ? "Something went wrong. Please try again later."
                        : "Try adjusting your date or status filters."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && !isLoading && data && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3">
          <p className="text-xs text-gray-500">
            Page <span className="font-medium text-gray-700">{page}</span> of{" "}
            <span className="font-medium text-gray-700">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
