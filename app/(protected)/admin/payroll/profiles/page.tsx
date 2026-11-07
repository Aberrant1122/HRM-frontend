"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Loader2,
    Edit,
    AlertTriangle,
    DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import {
    getAllPayrollProfiles,
    getEmployeesWithoutProfiles,
} from "@/lib/actions/payroll.actions";
import { PayrollProfile, EmployeeWithoutProfile } from "@/lib/types/payroll.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Header } from "@/components/header";
import { PayrollStatsCard } from "@/components/payroll/PayrollStatsCard";
import { EmptyPayrollState } from "@/components/payroll/EmptyPayrollState";
import Link from "next/link";
import { Users, UserCheck, UserX } from "lucide-react";

export default function PayrollProfilesPage() {
    const [profiles, setProfiles] = useState<PayrollProfile[]>([]);
    const [missingProfiles, setMissingProfiles] = useState<EmployeeWithoutProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [profilesRes, missingRes] = await Promise.all([
                getAllPayrollProfiles(),
                getEmployeesWithoutProfiles(),
            ]);

            if (profilesRes.success) {
                setProfiles(profilesRes.data);
            }
            if (missingRes.success) {
                setMissingProfiles(missingRes.data);
            }
        } catch (error) {
            toast.error("Failed to load payroll profiles");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);


    const filteredProfiles = profiles.filter(
        (p) =>
            p.employee?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.employee?.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: "Admin", href: "/admin" },
                    { label: "Payroll", href: "/admin/payroll" },
                    { label: "Payroll Profiles" },
                ]}
            />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Payroll Profiles</h1>
                        <p className="text-muted-foreground">
                            Manage employee salary configurations and payroll settings.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/admin/payroll/profiles/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Profile
                        </Link>
                    </Button>
                </div>

                {missingProfiles.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                                <CardTitle className="text-amber-900">
                                    Missing Payroll Profiles
                                </CardTitle>
                            </div>
                            <CardDescription className="text-amber-700">
                                The following employees need payroll profiles before you can generate
                                payroll.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {missingProfiles.map((emp) => (
                                    <div
                                        key={emp.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg border gap-3"
                                    >
                                        <div>
                                            <p className="font-medium">{emp.fullName}</p>
                                            <p className="text-sm text-muted-foreground">{emp.email}</p>
                                        </div>
                                        <Button size="sm" asChild className="w-full sm:w-auto">
                                            <Link href={`/admin/payroll/profiles/create?employeeId=${emp.id}`}>
                                                Create Profile
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PayrollStatsCard
                        title="Total Profiles"
                        value={profiles.length}
                        description="Employees with payroll setup"
                        icon={UserCheck}
                        iconColor="text-green-600"
                    />
                    <PayrollStatsCard
                        title="Missing Profiles"
                        value={missingProfiles.length}
                        description="Employees needing setup"
                        icon={UserX}
                        iconColor="text-amber-600"
                    />
                    <PayrollStatsCard
                        title="Total Employees"
                        value={profiles.length + missingProfiles.length}
                        description="Active employees"
                        icon={Users}
                        iconColor="text-blue-600"
                    />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Employee Payroll Profiles</CardTitle>
                                <CardDescription>
                                    View and manage salary configurations for all employees.
                                </CardDescription>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search employees..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p>Loading profiles...</p>
                            </div>
                        ) : filteredProfiles.length === 0 ? (
                            <EmptyPayrollState
                                icon={DollarSign}
                                title="No payroll profiles found"
                                description="Create profiles for employees to enable payroll generation."
                            />
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table className="min-w-[700px]">
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Salary Type</TableHead>
                                            <TableHead className="text-right">Base Salary</TableHead>
                                            <TableHead className="text-center">Overtime</TableHead>
                                            <TableHead className="text-right">Tax %</TableHead>
                                            <TableHead className="text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProfiles.map((profile) => (
                                            <TableRow key={profile.id}>
                                                <TableCell>
                                                    <div className="font-semibold">
                                                        {profile.employee?.fullName}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {profile.employee?.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {profile.salary_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    <div className="flex items-center justify-end gap-2 group">
                                                        <span>{profile.base_salary}</span>
                                                        <Link
                                                            href={`/admin/payroll/profiles/${profile.id}/revisions`}
                                                            aria-label="Salary history and revision" className="text-muted-foreground underline"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Link>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {profile.overtime_eligible ? (
                                                        <Badge variant="default" className="bg-green-600">
                                                            Yes
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">No</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {Number(profile.tax_percentage)}%
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={`/admin/payroll/profiles/${profile.id}/edit`}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Link className="underline text-sm" href={`/admin/payroll/profiles/${profile.id}/revisions`}>Salary history</Link>
                                                    </div>
                                                </TableCell>
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
