"use client";

import { useState } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/header";
import { PersonalInformationForm } from "@/components/forms/personal-information-form";
import { WorkInformationForm } from "@/components/forms/work-information-form";
import { EmployeeAttachmentsForm } from "@/components/forms/employee-attachments-form";
import { FormSuccess } from "@/components/forms/form-success";
import { FormActions } from "@/components/forms/form-actions";
import {
  type EmployeeFormData,
  initialEmployeeFormData,
  type InviteEmployeeBody,
} from "@/lib/types/employee.types";
import { inviteEmployee, uploadEmployeeAttachments } from "@/lib/actions/employee.actions";
import { z } from "zod";
import { employeeFormSchema } from "@/lib/validations/employee.schema";

export default function AddEmployeePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<
    Record<string, { message: string }>
  >({});
  const [formData, setFormData] = useState<EmployeeFormData>(
    initialEmployeeFormData
  );
  const [createdUserId, setCreatedUserId] = useState<number | undefined>(undefined);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]:
        field === "salary" && typeof value === "string"
          ? value === ""
            ? ""
            : parseInt(value, 10) || 0
          : value,
    }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Real-time validation for specific fields
    if (field === "email" && value && typeof value === "string") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setFormErrors((prev) => ({
          ...prev,
          [field]: { message: "Please enter a valid email address" },
        }));
      }
    }

    if (field === "cnic" && value && typeof value === "string") {
      if (!/^\d{5}-\d{7}-\d{1}$/.test(value)) {
        setFormErrors((prev) => ({
          ...prev,
          [field]: { message: "CNIC format should be 12345-1234567-1" },
        }));
      }
    }

    if (field === "contactNumber" && value && typeof value === "string") {
      if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(value)) {
        setFormErrors((prev) => ({
          ...prev,
          [field]: { message: "Please enter a valid phone number" },
        }));
      }
    }
  };

  const handleAttachmentsChange = (attachments: File[]) => {
    setFormData((prev) => ({
      ...prev,
      attachments,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormErrors({});

    // Check for required fields and set individual field errors
    const requiredFields = [
      "fullName",
      "email",
      "contactNumber",
      "cnic",
      "department",
      "position",
      "startDate",
      "employmentType",
    ];

    const newErrors: Record<string, { message: string }> = {};
    let hasErrors = false;

    requiredFields.forEach((field) => {
      const value = formData[field as keyof typeof formData];
      if (value === "" || value === undefined || value === null) {
        newErrors[field] = { message: "This field is required" };
        hasErrors = true;
      }
    });

    // Additional validation for specific fields
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = { message: "Please enter a valid email address" };
      hasErrors = true;
    }

    if (formData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic)) {
      newErrors.cnic = { message: "CNIC format should be 12345-1234567-1" };
      hasErrors = true;
    }

    if (formData.contactNumber && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = { message: "Please enter a valid phone number" };
      hasErrors = true;
    }

    if (hasErrors) {
      setFormErrors(newErrors);
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setIsLoading(true);

    try {
      const employeeData: InviteEmployeeBody = {
        fullName: formData.fullName,
        email: formData.email,
        role: "employee",
        cnic: formData.cnic,
        contactNumber: formData.contactNumber,
        address: formData.address,
        dob: formData.dob
          ? new Date(formData.dob).toISOString()
          : new Date().toISOString(),
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : new Date().toISOString(),
        department: formData.department,
        reportingManager: formData.reportingManager || "",
        probationEndDate: formData.probationEndDate
          ? new Date(formData.probationEndDate).toISOString()
          : "",
        employmentStatus: formData.employmentType,
        salary: formData.salary ? parseInt(formData.salary as string) : 0,
        designation: formData.position,
        team: formData.team || "",
      };

      const result = await inviteEmployee(employeeData);

      if (result) {
        setCreatedUserId(result.userId);
        // Upload attachments if any
        if (formData.attachments && formData.attachments.length > 0) {
          try {
            await uploadEmployeeAttachments(result.userId, formData.attachments);
            toast.success("Employee added and attachments uploaded successfully!");
          } catch (attachmentError) {
            console.error("Failed to upload attachments:", attachmentError);
            toast.warning("Employee added but failed to upload some attachments");
          }
        }

        setSuccess(true);
      } else {
        throw new Error("Failed to add employee: No result returned");
      }
    } catch (err) {
      const error = err as Error;
      const errorMessage = error.message || "Failed to add employee";

      toast.error(errorMessage);
      setFormErrors((prev) => ({
        ...prev,
        form: { message: errorMessage },
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnother = () => {
    setSuccess(false);
    setFormData({
      ...initialEmployeeFormData,
    });
    setFormErrors({});
  };

  if (success) {
    return (
      <>
        <Header
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Employees", href: "/admin/employees" },
            { label: "Add Employee" },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <FormSuccess
            employeeName={formData.fullName}
            onAddAnother={handleAddAnother}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Employees", href: "/admin/employees" },
          { label: "Add Employee" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Add New Employee
            </h2>
            <p className="text-gray-600">
              Enter employee information to add them to the system
            </p>
          </div>
          <Button variant="outline" asChild><Link href="/admin/employees/import">Add employees in bulk</Link></Button>
          <Button variant="outline" asChild>
            <Link href="/admin/employees">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Link>
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          id="addEmployeeForm"
        >
          {formErrors.form && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {formErrors.form.message}
              </AlertDescription>
            </Alert>
          )}
          <PersonalInformationForm
            formData={formData}
            onInputChange={handleInputChange}
            errors={formErrors}
          />
          <WorkInformationForm
            formData={formData}
            onInputChange={handleInputChange}
            errors={formErrors}
          />
          <EmployeeAttachmentsForm
            attachments={formData.attachments}
            onAttachmentsChange={handleAttachmentsChange}
            errors={formErrors}
            userId={createdUserId}
          />
          <FormActions isLoading={isLoading} />
        </form>
      </div>
    </>
  );
}
