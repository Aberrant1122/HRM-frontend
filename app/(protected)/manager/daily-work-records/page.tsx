"use client";

import { openAttendanceDeliverable } from '@/lib/attendance-deliverable';
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ExternalLink, Calendar } from "lucide-react";
import { getAuthToken } from "@/lib/auth/token";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

interface Deliverable {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
}

interface DailyWorkRecord {
  id: number;
  employee: {
    id: number;
    name: string;
    email: string;
  };
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  task: {
    id: number;
    name: string;
    status: string;
    priority: string;
  } | null; // Task can be null when no task was selected during checkout
  taskStatus: "planning" | "in-progress" | "testing" | "blocked" | "completed" | null;
  workNote: string | null;
  deliverableLink: string | null;
  deliverables: Deliverable[];
  totalHours: number;
  formattedHours: string;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api").replace(/\/+$/, "");

export default function ManagerDailyWorkRecordsPage() {
  const [records, setRecords] = useState<DailyWorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: "",
    employeeId: "all",
    taskStatus: "all",
  });
  const { user } = useAuth();

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const params = new URLSearchParams();
      if (filters.date) params.append("date", filters.date);
      if (filters.employeeId && filters.employeeId !== "all") params.append("employeeId", filters.employeeId);
      if (filters.taskStatus && filters.taskStatus !== "all") params.append("taskStatus", filters.taskStatus);

      const response = await fetch(
        `${API_BASE_URL}/attendance/daily-work-records?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch daily work records");
      }

      const data = await response.json();
      setRecords(data.data || []);
    } catch (error) {
      console.error("Error fetching daily work records:", error);
      toast.error("Failed to load daily work records");
    } finally {
      setLoading(false);
    }
  }, [filters.date, filters.employeeId, filters.taskStatus]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const getStatusBadgeVariant = (status: string | null) => {
    if (!status) return "outline";
    switch (status) {
      case "completed":
        return "default";
      case "in-progress":
        return "secondary";
      case "testing":
        return "outline";
      case "blocked":
        return "destructive";
      case "planning":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Get unique employees from records
  const employees = Array.from(
    new Map(records.map((r) => [r.employee.id, r.employee])).values()
  );

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Manager", href: "/manager" },
          { label: "Daily Work Records" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="mb-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Daily Work Records
          </h2>
          <p className="text-gray-600">
            View and filter daily work records from your team
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter work records by date, employee, or status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={filters.date}
                  onChange={(e) =>
                    setFilters({ ...filters, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={filters.employeeId}
                  onValueChange={(value) =>
                    setFilters({ ...filters, employeeId: value })
                  }
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskStatus">Task Status</Label>
                <Select
                  value={filters.taskStatus}
                  onValueChange={(value) =>
                    setFilters({ ...filters, taskStatus: value })
                  }
                >
                  <SelectTrigger id="taskStatus">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({ date: "", employeeId: "all", taskStatus: "all" })
                  }
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Work Records</CardTitle>
            <CardDescription>
              {records.length} record{records.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No work records found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Deliverable Link</TableHead>
                      <TableHead>Deliverable Files</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.employee.name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(record.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{formatTime(record.checkIn)}</TableCell>
                        <TableCell>{formatTime(record.checkOut)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.task?.name || "No task assigned"}</div>
                            <div className="text-xs text-gray-500">
                              {record.task?.priority || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(record.taskStatus)}
                          >
                            {record.taskStatus || "No Status"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {record.workNote || "-"}
                        </TableCell>
                        <TableCell>
                          {record.deliverableLink ? (
                            <a
                              href={record.deliverableLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Link
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {Array.isArray(record.deliverables) && record.deliverables.length > 0 ? (
                            <div className="space-y-1">
                              {record.deliverables.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={file.url.startsWith("/attendance/deliverables/") ? "#" : file.url}
                                  onClick={file.url.startsWith("/attendance/deliverables/") ? e => { e.preventDefault(); void openAttendanceDeliverable(file.url).catch(() => alert("Deliverable unavailable")); } : undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {file.filename}
                                </a>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{record.formattedHours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
