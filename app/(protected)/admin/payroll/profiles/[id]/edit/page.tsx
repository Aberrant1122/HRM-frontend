"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    getPayrollProfileById,
    updatePayrollProfile,
} from "@/lib/actions/payroll.actions";
import { PayrollProfile } from "@/lib/types/payroll.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/header";

export default function EditPayrollProfilePage() {
    const router = useRouter();
    const params = useParams();
    const profileId = Number(params.id);

    const [profile, setProfile] = useState<PayrollProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        salary_type: "monthly",
        base_salary: "",
        standard_working_days: "22",
        standard_working_hours: "8",
        overtime_eligible: false,
        overtime_rate: "0",
        tax_percentage: "0",
        late_penalty_enabled: false,
        late_penalty_amount: "0",
        leave_deduction_enabled: false,
        leave_deduction_amount: "0",
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getPayrollProfileById(profileId);
                if (res.success && res.data) {
                    const p = res.data;
                    setProfile(p);
                    
                    // Parse late penalty rule
                    const latePenalty = p.late_penalty_rule as { enabled?: boolean; penalty_per_late?: number } | null;
                    const lateEnabled = latePenalty?.enabled || false;
                    const lateAmount = latePenalty?.penalty_per_late || 0;

                    // Parse leave deduction rule
                    const leaveDeduction = p.leave_deduction_rule as { enabled?: boolean; deduction_per_day?: number } | null;
                    const leaveEnabled = leaveDeduction?.enabled || false;
                    const leaveAmount = leaveDeduction?.deduction_per_day || 0;

                    setFormData({
                        salary_type: p.salary_type,
                        base_salary: String(p.base_salary),
                        standard_working_days: String(p.standard_working_days || 22),
                        standard_working_hours: String(p.standard_working_hours || 8),
                        overtime_eligible: p.overtime_eligible || false,
                        overtime_rate: String(p.overtime_rate || 0),
                        tax_percentage: String(p.tax_percentage || 0),
                        late_penalty_enabled: lateEnabled,
                        late_penalty_amount: String(lateAmount),
                        leave_deduction_enabled: leaveEnabled,
                        leave_deduction_amount: String(leaveAmount),
                    });
                } else {
                    toast.error("Failed to load payroll profile");
                    router.push("/admin/payroll/profiles");
                }
            } catch (error) {
                toast.error("Failed to load payroll profile");
                router.push("/admin/payroll/profiles");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [profileId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsSubmitting(true);

            const latePenaltyRule = formData.late_penalty_enabled
                ? {
                      enabled: true,
                      penalty_per_late: Number(formData.late_penalty_amount),
                  }
                : null;

            const leaveDeductionRule = formData.leave_deduction_enabled
                ? {
                      enabled: true,
                      deduction_per_day: Number(formData.leave_deduction_amount),
                  }
                : null;

            const res = await updatePayrollProfile(profileId, {
                standard_working_days: Number(formData.standard_working_days),
                standard_working_hours: Number(formData.standard_working_hours),
                overtime_eligible: formData.overtime_eligible,
                overtime_rate: Number(formData.overtime_rate),
                late_penalty_rule: latePenaltyRule,
                leave_deduction_rule: leaveDeductionRule,
                tax_percentage: Number(formData.tax_percentage),
            });

            if (res.success) {
                toast.success("Payroll profile updated successfully");
                router.push("/admin/payroll/profiles");
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Failed to update payroll profile");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <>
                <Header
                    breadcrumbs={[
                        { label: "Admin", href: "/admin" },
                        { label: "Payroll", href: "/admin/payroll" },
                        { label: "Profiles", href: "/admin/payroll/profiles" },
                        { label: "Edit Profile" },
                    ]}
                />
                <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Loading profile...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: "Admin", href: "/admin" },
                    { label: "Payroll", href: "/admin/payroll" },
                    { label: "Profiles", href: "/admin/payroll/profiles" },
                    { label: "Edit Profile" },
                ]}
            />

            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                            Edit Payroll Profile
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Update salary configuration for {profile?.employee?.fullName}
                        </p>
                    </div>
                </div>

                <p className="mb-4"><a className="underline" href={`/admin/payroll/profiles/${profileId}/revisions`}>View salary history or revise base amount and basis</a></p>
                    <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>
                                Configure salary type, base pay, and payroll rules.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Employee Info (Read-only) */}
                            <div className="grid gap-2">
                                <Label>Employee</Label>
                                <div className="p-3 bg-muted rounded-md">
                                    <p className="font-medium">{profile?.employee?.fullName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {profile?.employee?.email}
                                    </p>
                                </div>
                            </div>

                            {/* Salary Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="salary_type">Salary Type *</Label>
                                    <Select disabled
                                        value={formData.salary_type}
                                        onValueChange={(v) =>
                                            setFormData({ ...formData, salary_type: v })
                                        }
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="hourly">Hourly</SelectItem>
                                            <SelectItem value="daily">Daily</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="base_salary">Base Salary *</Label>
                                    <Input
                                        disabled id="base_salary"
                                        type="number"
                                        step="0.01"
                                        placeholder="5000.00"
                                        value={formData.base_salary}
                                        onChange={(e) =>
                                            setFormData({ ...formData, base_salary: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            {/* Working Standards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="working_days">Standard Working Days</Label>
                                    <Input
                                        id="working_days"
                                        type="number"
                                        value={formData.standard_working_days}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                standard_working_days: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="working_hours">Standard Working Hours</Label>
                                    <Input
                                        id="working_hours"
                                        type="number"
                                        value={formData.standard_working_hours}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                standard_working_hours: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Overtime */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Overtime Eligible</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Enable overtime pay for this employee
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.overtime_eligible}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, overtime_eligible: checked })
                                        }
                                    />
                                </div>

                                {formData.overtime_eligible && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="overtime_rate">Overtime Rate (per hour)</Label>
                                        <Input
                                            id="overtime_rate"
                                            type="number"
                                            step="0.01"
                                            placeholder="15.00"
                                            value={formData.overtime_rate}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    overtime_rate: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Tax */}
                            <div className="grid gap-2">
                                <Label htmlFor="tax">Tax Percentage</Label>
                                <Input
                                    id="tax"
                                    type="number"
                                    step="0.01"
                                    placeholder="10.00"
                                    value={formData.tax_percentage}
                                    onChange={(e) =>
                                        setFormData({ ...formData, tax_percentage: e.target.value })
                                    }
                                />
                            </div>

                            {/* Late Penalty */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Late Penalty</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Deduct amount for each late arrival
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.late_penalty_enabled}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, late_penalty_enabled: checked })
                                        }
                                    />
                                </div>

                                {formData.late_penalty_enabled && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="late_penalty">Penalty per Late</Label>
                                        <Input
                                            id="late_penalty"
                                            type="number"
                                            step="0.01"
                                            placeholder="50.00"
                                            value={formData.late_penalty_amount}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    late_penalty_amount: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Leave Deduction */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Leave Deduction</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Deduct amount for unpaid leave days
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.leave_deduction_enabled}
                                        onCheckedChange={(checked) =>
                                            setFormData({
                                                ...formData,
                                                leave_deduction_enabled: checked,
                                            })
                                        }
                                    />
                                </div>

                                {formData.leave_deduction_enabled && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="leave_deduction">Deduction per Day</Label>
                                        <Input
                                            id="leave_deduction"
                                            type="number"
                                            step="0.01"
                                            placeholder="100.00"
                                            value={formData.leave_deduction_amount}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    leave_deduction_amount: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Update Profile"
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </>
    );
}
