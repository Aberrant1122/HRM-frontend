"use client";

import { useState, useEffect } from "react";
import { Search, Eye, Edit, MoreHorizontal, Loader2, User, Key } from "lucide-react";
import Link from "next/link";
import { getAllEmployees } from "@/lib/actions/employee.actions";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/header";

import { Employee } from "@/lib/types/employee.types";
import { formatCalendarDate } from "@/lib/calendar-date";

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

export default function EmployeeProfilesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchEmployees = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getAllEmployees(currentPage, 12, { search });
        if (cancelled) return;
        if (response.success) {
          const normalizedEmployees = response.data.map((emp) => ({
            ...emp,
            status: normalizeStatus(emp.status),
          }));
          setEmployees(normalizedEmployees);
          setTotalPages(response.pagination?.totalPages ?? 0);
          setTotalItems(response.pagination?.totalItems ?? 0);
        } else {
          throw new Error("Failed to fetch employees");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching employees:", err);
        setError("Failed to load employee profiles. Please try again later.");
        setEmployees([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchEmployees();
    return () => { cancelled = true; };
  }, [currentPage, search, refreshVersion]);

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Employee Management", href: "/admin/employees" },
          { label: "Employee Profiles" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employee Profiles</h1>
            <p className="text-muted-foreground">
              View profiles for employee-role accounts across all pages
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/employees">
                <User className="mr-2 h-4 w-4" />
                All Employees
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/employees/add">
                <User className="mr-2 h-4 w-4" />
                Add Employee
              </Link>
            </Button>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Employees</CardTitle>
            <CardDescription>
              Search all employee-role accounts by name, email, department, or position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-wrap items-center gap-2" onSubmit={event => {
              event.preventDefault(); setCurrentPage(1); setSearch(searchTerm.trim()); setRefreshVersion(value => value + 1);
            }}>
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, department, or position..."
                aria-label="Search all profiles"
                maxLength={100}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              <Button type="submit">Search profiles</Button>
              <Button type="button" variant="outline" onClick={() => { setSearchTerm(""); setSearch(""); setCurrentPage(1); }}>Clear search</Button>
            </form>
          </CardContent>
        </Card>
        {/* Employee Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!isLoading && !error && employees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    {employee.profilePicture && (
                      <AvatarImage
                        src={employee.profilePicture}
                        alt={employee.fullName}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="text-lg">
                      {employee.fullName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {employee.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {employee.email}
                    </p>
                    <Badge
                      variant={
                        employee.status === "active"
                          ? "default"
                          : employee.status === "unknown"
                            ? "secondary"
                            : "destructive"
                      }
                      className="mt-1"
                    >
                      {employee.status}
                    </Badge>
                  </div>
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
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/employees/${employee.id}?edit=true`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/employees/${employee.id}?password=true`)}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">
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
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Position</p>
                      <p className="font-medium">
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
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Employee ID</p>
                      <p className="font-medium">#{employee.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Join Date</p>
                      <p className="font-medium">
                        {formatCalendarDate(employee.userInfo?.startDate)}
                      </p>
                    </div>
                  </div>

                  {employee.userInfo?.contactNumber && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Contact</p>
                      <p className="font-medium">{employee.userInfo.contactNumber}</p>
                    </div>
                  )}

                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/admin/employees/${employee.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/admin/employees/${employee.id}?edit=true`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">{isLoading ? "Loading profiles…" : error ? "Profiles unavailable" : `${totalItems} matching accounts`}{search ? ` · Search: ${search}` : ""}</p>
        {error && <div role="alert" className="text-red-600">{error} <Button variant="outline" onClick={() => setRefreshVersion(value => value + 1)}>Retry profiles</Button></div>}
        {!isLoading && !error && totalPages > 1 && <div className="flex items-center justify-between gap-3">
          <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(value => value - 1)}>Previous profiles</Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(value => value + 1)}>Next profiles</Button>
        </div>}
        {employees.length === 0 && !isLoading && !error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search
                  ? "No employees match your search criteria. Try adjusting your search terms."
                  : "No employees have been added to the system yet."}
              </p>
              {!search && (
                <Button asChild>
                  <Link href="/admin/employees/add">
                    Add First Employee
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
