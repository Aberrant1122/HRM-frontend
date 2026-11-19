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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, ExternalLink, Download, Eye, Clock, Calendar, User, FileText, Link as LinkIcon, Paperclip, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { getAuthToken } from "@/lib/auth/token";
import { toast } from "sonner";
import { format } from "date-fns";

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

export default function AdminDailyWorkRecordsPage() {
  const [records, setRecords] = useState<DailyWorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: "",
    employeeId: "all",
    taskStatus: "all",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });
  const [allEmployees, setAllEmployees] = useState<
    { id: number; name: string; email: string }[]
  >([]);
  const [selectedRecord, setSelectedRecord] = useState<DailyWorkRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
      params.append("page", pagination.currentPage.toString());
      params.append("limit", pagination.limit.toString());

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

      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination.totalPages,
          totalItems: data.pagination.totalItems,
        }));
      }

      // Extract unique employees - only for the current page, which is fine for the filter list
      // Better: we should have a separate endpoint for all employees, but for now this works as it builds up
      const currentEmployees: { id: number; name: string; email: string }[] = Array.from(
        new Map(
          data.data?.map((r: DailyWorkRecord) => [
            r.employee.id,
            r.employee,
          ]) || []
        ).values()
      ) as { id: number; name: string; email: string }[];

      setAllEmployees(prev => {
        const combined = [...prev, ...currentEmployees];
        return Array.from(new Map(combined.map(e => [e.id, e])).values()) as { id: number; name: string; email: string }[];
      });
    } catch (error) {
      console.error("Error fetching daily work records:", error);
      toast.error("Failed to load daily work records");
    } finally {
      setLoading(false);
    }
  }, [filters.date, filters.employeeId, filters.taskStatus, pagination.currentPage, pagination.limit]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [filters.date, filters.employeeId, filters.taskStatus]);

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
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    }
    const parts = timeString.split(":");
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  const exportToCSV = () => {
    const headers = [
      "Employee",
      "Date",
      "Check-in",
      "Check-out",
      "Task",
      "Task Status",
      "Work Note",
      "Deliverable Link",
      "Hours",
    ];

    const rows = records.map((record) => [
      record.employee.name,
      format(new Date(record.date), "MMM dd, yyyy"),
      formatTime(record.checkIn) || "-",
      formatTime(record.checkOut) || "-",
      record.task?.name || "No task assigned",
      record.taskStatus || "No Status",
      record.workNote || "-",
      record.deliverableLink || "-",
      record.formattedHours,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-work-records-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Daily Work Records" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Daily Work Records
            </h2>
            <p className="text-gray-600">
              View and filter daily work records from all employees
            </p>
          </div>
          {records.length > 0 && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
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
                    {allEmployees.map((emp) => (
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{record.employee.name}</div>
                            <div className="text-xs text-gray-500">
                              {record.employee.email}
                            </div>
                          </div>
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord(record);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.limit + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)}
                  </span>{" "}
                  of <span className="font-medium">{pagination.totalItems}</span> records
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(prev.currentPage - 1, 1) }))}
                    disabled={pagination.currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center px-4 text-sm font-medium">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(prev.currentPage + 1, prev.totalPages) }))}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Record Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Work Record Details</DialogTitle>
            <DialogDescription>
              Detailed information for {selectedRecord?.employee.name} on {selectedRecord?.date ? format(new Date(selectedRecord.date), "MMMM dd, yyyy") : ""}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Employee & Time Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Employee</Label>
                  <p className="font-medium">{selectedRecord?.employee.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRecord?.employee.email}</p>
                </div>
                <div className="space-y-1 text-right">
                  <Label className="text-muted-foreground">Duration</Label>
                  <p className="text-xl font-bold text-blue-600">{selectedRecord?.formattedHours}</p>
                </div>
              </div>

              <Separator />

              {/* Timing Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Check-in</Label>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {formatTime(selectedRecord?.checkIn || null)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Check-out</Label>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {formatTime(selectedRecord?.checkOut || null)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Task Info */}
              <div className="space-y-3">
                <Label className="text-muted-foreground">Task Information</Label>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-lg">{selectedRecord?.task?.name || "No task specified"}</p>
                    <p className="text-sm text-muted-foreground">Priority: {selectedRecord?.task?.priority || "N/A"}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(selectedRecord?.taskStatus || null)} className="capitalize">
                    {selectedRecord?.taskStatus || "No Status"}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Work Note */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Work Note</Label>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedRecord?.workNote || "No notes provided."}
                  </p>
                </div>
              </div>

              {/* Deliverables */}
              {(selectedRecord?.deliverableLink || (selectedRecord?.deliverables && selectedRecord.deliverables.length > 0)) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    {selectedRecord?.deliverableLink && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Deliverable Link</Label>
                        <a
                          href={selectedRecord.deliverableLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View External Resource
                        </a>
                      </div>
                    )}

                    {selectedRecord?.deliverables && selectedRecord.deliverables.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Attached Files</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedRecord.deliverables.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url.startsWith("/attendance/deliverables/") ? "#" : file.url}
                                  onClick={file.url.startsWith("/attendance/deliverables/") ? e => { e.preventDefault(); void openAttendanceDeliverable(file.url).catch(() => alert("Deliverable unavailable")); } : undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/50 transition-colors text-sm"
                            >
                              <Download className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{file.filename}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
