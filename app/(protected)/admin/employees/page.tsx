"use client";

import { formatCalendarDate } from "@/lib/calendar-date";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getAllEmployees, deleteEmployee, getEmployeeAccountSummary } from "@/lib/actions/employee.actions";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Header } from "@/components/header";
import { AddEmployeeForm } from "@/components/add-employee-form";

import { Employee, UserInfo, EmployeeAccountSummary } from "@/lib/types/employee.types";

// Define the valid status types
type EmployeeStatus = "active" | "inactive" | "suspended" | "unknown";

// Extend the Employee type to include the status type
interface EmployeeWithStatus extends Omit<Employee, "status"> {
  status: EmployeeStatus;
}

// Helper function to normalize status
const normalizeStatus = (status: string): EmployeeStatus => {
  switch (status) {
    case "active":
    case "inactive":
    case "suspended":
      return status;
    default:
      return "unknown";
  }
};

export default function AdminEmployeesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeWithStatus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;
  const [accountSummary, setAccountSummary] = useState<EmployeeAccountSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const refreshAccountSummary = async () => {
    try { setAccountSummary(await getEmployeeAccountSummary()); setSummaryError(false); }
    catch { setAccountSummary(null); setSummaryError(true); }
  };
  useEffect(() => { refreshAccountSummary(); }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchEmployees = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAllEmployees(page, limit, filters);
      if (cancelled) return;
      if (response.success) {
        const normalizedEmployees = response.data.map((emp) => ({
          ...emp,
          status: normalizeStatus(emp.status),
        }));
        setEmployees(normalizedEmployees);
        if (response.pagination) {
          if (page > Math.max(1, response.pagination.totalPages)) {
            setCurrentPage(Math.max(1, response.pagination.totalPages));
            return;
          }
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.totalItems);
        }
      } else {
        throw new Error("Failed to fetch employees");
      }
    } catch (err) {
      if (cancelled) return;
      console.error("Error fetching employees:", err);
      setError("Failed to load employees. Please try again later.");
      setEmployees([]);
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  };

    fetchEmployees(currentPage);
    return () => { cancelled = true; };
  }, [currentPage, filters, refreshVersion]);

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      setIsDeleting(true);
      await deleteEmployee(employeeToDelete.id);

      // Reconcile the retained account against the current server-side filters/page.
      setRefreshVersion(value => value + 1);

      await refreshAccountSummary();
      toast.success("Employee deactivated successfully");
      setEmployeeToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to deactivate employee";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Employee Information" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Employee accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountSummary?.counts.total ?? (summaryError ? "Unavailable" : "…")}
              </div>
              <p className="text-xs text-muted-foreground">Employee logins and preserved HR membership (all pages, unfiltered)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Configured departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accountSummary?.departments.activeConfigurations ?? (summaryError ? "Unavailable" : "…")}</div>
              <p className="text-xs text-muted-foreground">
                Active department configurations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountSummary?.counts.active ?? (summaryError ? "Unavailable" : "…")}
              </div>
              <p className="text-xs text-muted-foreground">Access enabled (all pages)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountSummary?.counts.inactive ?? (summaryError ? "Unavailable" : "…")}
              </div>
              <p className="text-xs text-muted-foreground">Inactive status; suspended: {accountSummary?.counts.suspended ?? "…"}; unknown: {accountSummary?.counts.unknown ?? "…"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Employee Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Employee Information</CardTitle>
                <CardDescription>
                  Manage your team members and their details
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/admin/employees/add">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Employee
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Directory: employee logins and preserved HR membership. Cards above show global, unfiltered totals.</p>
            <form className="flex flex-wrap items-end gap-3 mb-6" onSubmit={event => {
              event.preventDefault(); setCurrentPage(1);
              setFilters({ search: searchTerm.trim(), status: statusFilter });
            }}>
              <Search className="h-4 w-4 text-gray-400" />
              <label className="grid gap-1 text-sm" htmlFor="directory-search">Search all accounts
              <Input
                id="directory-search"
                placeholder="Name, email, department, or position"
                maxLength={100}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 max-w-full"
              />
              </label>
              <label className="grid gap-1 text-sm" htmlFor="directory-status">Account status
                <select id="directory-status" className="h-9 rounded-md border bg-background px-3" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                  <option value="">All account statuses</option>
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                </select>
              </label>
              <Button type="submit">Search directory</Button>
              <Button type="button" variant="outline" onClick={() => {
                setSearchTerm(""); setStatusFilter(""); setCurrentPage(1); setFilters({ search: "", status: "" });
              }}>Clear filters</Button>
            </form>
            <p className="text-sm text-muted-foreground mb-3" aria-live="polite">
              {isLoading ? "Loading directory…" : error ? "Directory unavailable" : `${totalItems} matching accounts`}
              {filters.search ? ` · Search: ${filters.search}` : ""}{filters.status ? ` · Account status: ${filters.status}` : ""}
            </p>
            {error && <div role="alert" className="mb-4 text-red-600">{error} <Button variant="outline" onClick={() => setRefreshVersion(value => value + 1)}>Retry directory</Button></div>}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && !error && employees.length === 0 && <TableRow><TableCell colSpan={6}>No matching accounts. Change or clear the filters.</TableCell></TableRow>}
                  {!isLoading && !error && employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            {employee.profilePicture && (
                              <AvatarImage
                                src={employee.profilePicture}
                                alt={employee.fullName}
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback>
                              {employee.fullName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.fullName}</p>
                            <p className="text-sm text-gray-500">
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.userInfo?.department
                          ? employee.userInfo.department
                            .split(" ")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() +
                                word.slice(1).toLowerCase()
                            )
                            .join(" ")
                          : "Not specified"}
                      </TableCell>
                      <TableCell>
                        {employee.userInfo?.position
                          ? employee.userInfo.position
                            .split(" ")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() +
                                word.slice(1).toLowerCase()
                            )
                            .join(" ")
                          : "Not specified"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            employee.status === "active"
                              ? "default"
                              : employee.status === "unknown"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCalendarDate((employee.userInfo as UserInfo)?.startDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/employees/${employee.id}`)}
                            >
                              <User className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/employees/${employee.id}?edit=true`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setEmployeeToDelete(employee)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate Employee
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {!error && !isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * limit, totalItems)}
                  </span>{" "}
                  of <span className="font-medium">{totalItems}</span> matching accounts
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center px-4 text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div >

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!employeeToDelete} onOpenChange={() => setEmployeeToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Employee</DialogTitle>
            <DialogDescription className="space-y-3">
              <span className="block">
                Are you sure you want to deactivate <strong>{employeeToDelete?.fullName}</strong>?
              </span>
              <span className="block">This disables account access and preserves employee records, payroll history, projects and tasks.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setEmployeeToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEmployee}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Deactivate Employee"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
