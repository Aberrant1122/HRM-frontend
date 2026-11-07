'use client';

import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllAttendance } from "@/lib/actions/attendance.actions";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Search, Download, Calendar, Users, Clock, TrendingUp, Filter, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { AllAttendanceResponse } from "@/lib/types/attendance.types";

export default function AttendanceReportsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AllAttendanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);
  const exportScope = useRef({ token, exportMonth });
  exportScope.current = { token, exportMonth };
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const requestSequence = useRef(0);
  const scope = useRef({ token, selectedDate });
  scope.current = { token, selectedDate };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const fetchAttendance = useCallback(async () => {
    if (!token) {
      setError("No authentication token available");
      setIsLoading(false);
      return;
    }

    const sequence = ++requestSequence.current;
    const current = () => mounted.current && sequence === requestSequence.current && scope.current.token === token && scope.current.selectedDate === selectedDate;
    try {
      setData(null);
      setIsLoading(true);
      const result = await getAllAttendance(token, selectedDate);
      if (!current()) return;
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data || null);
        setError(null);
      }
    } catch (err) {
      if (current()) setError("Failed to fetch attendance data");
    } finally {
      if (current()) { setIsLoading(false); setLastRefresh(new Date()); }
    }
  }, [token, selectedDate]);

  useEffect(() => {
    // Initial fetch
    fetchAttendance();
  }, [fetchAttendance]);

  const formatTime = (time?: string | null) => {
    if (!time) return "-";
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    }
    const parts = time.split(":");
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    }
    return time;
  };

  const statusBadge = (status: string) => {
    const normalized = status?.toLowerCase();
    if (normalized === "present")
      return <Badge className="bg-green-100 text-green-800 border-green-200">Present</Badge>;
    if (normalized === "late")
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Late</Badge>;
    if (normalized === "absent")
      return <Badge className="bg-red-100 text-red-800 border-red-200">Absent</Badge>;
    if (normalized === "early_leave")
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Early Leave</Badge>;
    return <Badge variant="secondary">{status || "-"}</Badge>;
  };

  // Calculate statistics
  const totalEmployees = data?.data?.length || 0;
  const presentEmployees = data?.data?.filter(emp => emp.status?.toLowerCase() === 'present').length || 0;
  const lateEmployees = data?.data?.filter(emp => emp.status?.toLowerCase() === 'conflict').length || 0;
  const absentEmployees = data?.data?.filter(emp => emp.status?.toLowerCase() === 'absent').length || 0;
  const attendanceRate = totalEmployees > 0 ? Math.round((presentEmployees / totalEmployees) * 100) : 0;

  // Filter data based on search and filters
  const filteredData = data?.data?.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.status?.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedDate]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleExport = async (format:'csv'|'xlsx') => {
    if (!token || exporting) return;
    setExporting(true);
    const current = () => mounted.current && exportScope.current.token === token && exportScope.current.exportMonth === exportMonth;
    try {
      const base = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005/api/').replace(/\/$/, '');
      const response = await fetch(base + '/attendance/export?month=' + encodeURIComponent(exportMonth)+'&format='+format, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (!response.ok) throw Error((await response.json()).message || 'Export unavailable');
      const blob = await response.blob(); if (!current()) return;
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `attendance-records-${exportMonth}.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { if (current()) setError(error instanceof Error ? error.message : 'Export unavailable'); }
    finally { if (mounted.current) setExporting(false); }
  };

  const handleRefresh = () => {
    fetchAttendance();
  };

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Attendance", href: "/admin/attendance" },
          { label: "Daily Attendance" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Daily Attendance</h1>
          <p className="text-gray-600">Review recorded attendance, missing records and conflicts.</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Employee Accounts</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{data?totalEmployees:'—'}</div>
              <p className="text-xs text-blue-600">Employee-role accounts</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Recorded Present</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{data?presentEmployees:'—'}</div>
              <p className="text-xs text-green-600">{data?`${attendanceRate}% of listed accounts`:'Records unavailable'}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Conflicting Records</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">{data?lateEmployees:'—'}</div>
              <p className="text-xs text-yellow-600">Need attention</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Recorded Absent</CardTitle>
              <Calendar className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">{data?absentEmployees:'—'}</div>
              <p className="text-xs text-red-600">Explicitly recorded as absent</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <CardDescription>Refine your attendance data view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="conflict">Conflicting records</SelectItem>
                  <SelectItem value="missing">No record</SelectItem>
                  <SelectItem value="leave">Recorded leave</SelectItem>
                  <SelectItem value="on-leave">Recorded on-leave</SelectItem>
                  <SelectItem value="half-day">Recorded half-day</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="early_leave">Early Leave</SelectItem>
                </SelectContent>
              </Select>

              <div className="w-full sm:w-[200px] relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>

              <Button onClick={handleRefresh} variant="outline" className="w-full sm:w-auto" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Input type="month" aria-label="Export month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} />
              <Button onClick={()=>void handleExport('xlsx')} disabled={exporting || !exportMonth} variant="outline" className="w-full sm:w-auto">Export monthly raw records (Excel)</Button>
              <Button onClick={()=>void handleExport('csv')} disabled={exporting || !exportMonth} variant="outline" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export monthly raw records (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
            <CardDescription>
              {error
                ? "Failed to load attendance data"
                : `Date: ${data?.date ?? "-"} • Showing ${paginatedData.length} of ${filteredData.length} records (Page ${currentPage} of ${totalPages || 1}) • Last updated: ${lastRefresh.toLocaleTimeString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Check In</TableHead>
                    <TableHead className="font-semibold">Check Out</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin mr-3 text-blue-600" />
                          <span className="text-gray-600">Loading attendance data...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-red-600 font-medium">Error loading data</span>
                          <span>{error}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((rec) => (
                      <TableRow key={`${rec.id}-${rec.email}-${rec.date}`} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {rec.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {rec.fullName}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{rec.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {new Date(rec.date + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(rec.date + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC",
                                weekday: "short",
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {formatTime(rec.clockIn)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {formatTime(rec.clockOut)}
                          </span>
                        </TableCell>
                        <TableCell>{statusBadge(rec.status)}{rec.status === "conflict" && <p>{rec.records?.map(r => r.status).join(", ")}</p>}</TableCell>
                        <TableCell>
                          <Link href={`/admin/daily-work-records?employeeId=${rec.userId}&date=${rec.date}`}>
                            <Button variant="ghost" size="sm" className="h-8 px-3">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-gray-400" />
                          <span className="font-medium">No attendance records found</span>
                          <span className="text-sm">Try adjusting your filters or search terms</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} records
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="min-w-[32px]"
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}


