"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Save, X, Loader2, Key, User, Trash2, Shield, Eye, EyeOff, Paperclip, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/header";
import { DepartmentManager } from "@/components/department-manager";
import {
  getEmployeeInfoById,
  updateEmployee,
  deleteEmployee,
  UpdateEmployeeData,
  changeEmployeePassword,
  updateEmployeeRole,
  uploadEmployeeAttachments,
  removeEmployeeAttachment,
} from "@/lib/actions/employee.actions";
import { EmployeeInfoResponse, Attachment } from "@/lib/types/employee.types";

export default function EmployeeDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = parseInt(params.id as string);

  const toDateInputValue = (value: string | undefined | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.valueOf())) return "";
    return d.toISOString().split("T")[0];
  };

  const [employee, setEmployee] = useState<EmployeeInfoResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "employee" | "client" | "manager">("employee");
  const [changingRole, setChangingRole] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [formData, setFormData] = useState<UpdateEmployeeData>({
    fullName: "",
    email: "",
    status: "",
    contactNumber: "",
    address: "",
    dob: "",
    department: "",
    position: "",
    reportingManager: "",
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const response = await getEmployeeInfoById(employeeId);
        if (response && response.success) {
          setEmployee(response.data);
          // Ensure attachments is always an array
          const employeeAttachments = response.data.personalInfo?.attachments;
          setAttachments(Array.isArray(employeeAttachments) ? employeeAttachments : []);
          setFormData({
            fullName: response.data.fullName || "",
            email: response.data.email || "",
            status: response.data.status || "",
            contactNumber: response.data.personalInfo?.contactNumber || "",
            address: response.data.personalInfo?.address || "",
            dob: toDateInputValue(response.data.personalInfo?.dob),
            department: response.data.personalInfo?.department || "",
            position: response.data.personalInfo?.position || "",
            reportingManager: response.data.personalInfo?.reportingManager || "",
          });
        } else {
          throw new Error("Failed to load employee data");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch employee";
        toast.error(message);
        router.push("/admin/employees");
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId, router]);

  // Check for edit and password query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('edit') === 'true') {
      setIsEditing(true);
    }
    if (urlParams.get('password') === 'true') {
      setShowPasswordDialog(true);
    }
  }, []);

  const handleInputChange = (field: keyof UpdateEmployeeData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Build update data object with only non-empty values
      const updateData: Record<string, unknown> = {};

      // Helper function to check if value is valid (not empty, not undefined, not null)
      const isValidValue = (value: unknown): boolean => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        return true;
      };

      // Only add fields that have valid values
      if (isValidValue(formData.fullName)) {
        updateData.fullName = String(formData.fullName).trim();
      }
      if (isValidValue(formData.email)) {
        updateData.email = String(formData.email).trim();
      }
      if (isValidValue(formData.status)) {
        updateData.status = String(formData.status).trim();
      }
      if (isValidValue(formData.contactNumber)) {
        updateData.contactNumber = String(formData.contactNumber).trim();
      }
      if (isValidValue(formData.address)) {
        updateData.address = String(formData.address).trim();
      }
      if (isValidValue(formData.dob)) {
        updateData.dob = String(formData.dob).trim();
      }
      if (isValidValue(formData.department)) {
        updateData.department = String(formData.department).trim();
      }
      if (isValidValue(formData.position)) {
        updateData.position = String(formData.position).trim();
      }
      if (isValidValue(formData.reportingManager)) {
        updateData.reportingManager = String(formData.reportingManager).trim();
      }

      console.log('FormData before filtering:', formData);
      console.log('Sending update data:', updateData);
      console.log('Update data keys:', Object.keys(updateData));
      console.log('Update data JSON:', JSON.stringify(updateData, null, 2));

      // Verify no undefined values are being sent
      Object.entries(updateData).forEach(([key, value]) => {
        if (value === undefined) {
          console.warn(`WARNING: Field "${key}" has undefined value, removing it`);
          delete updateData[key];
        }
      });

      const response = await updateEmployee(employeeId, updateData);

      if (response && response.success) {
        setEmployee(response.data);
        toast.success("Employee updated successfully");
        setIsEditing(false);

        // Refresh the page to show updated data
        window.location.reload();
      } else {
        throw new Error("Failed to update employee");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update employee";
      toast.error(message);
      console.error('Update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (employee) {
      setFormData({
        fullName: employee.fullName || "",
        email: employee.email || "",
        status: employee.status || "",
        contactNumber: employee.personalInfo?.contactNumber || "",
        address: employee.personalInfo?.address || "",
        dob: toDateInputValue(employee.personalInfo?.dob),
        department: employee.personalInfo?.department || "",
        position: employee.personalInfo?.position || "",
        reportingManager: employee.personalInfo?.reportingManager || "",
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteEmployee(employeeId);
      toast.success("Employee deactivated successfully");
      router.push("/admin/employees");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to deactivate employee";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    try {
      setChangingPassword(true);
      await changeEmployeePassword(employeeId, newPassword);
      toast.success("Password changed successfully");
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePasswordDialogClose = () => {
    setShowPasswordDialog(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangeRole = async () => {
    try {
      setChangingRole(true);
      const response = await updateEmployeeRole(employeeId, selectedRole);
      toast.success(response.message || "Role updated successfully");

      // Update local employee data
      if (employee) {
        setEmployee({ ...employee, role: selectedRole });
      }

      setShowRoleDialog(false);

      // Show additional message if promoted to manager
      if (selectedRole === "manager") {
        toast.info("Employee can now access the Manager Dashboard");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update role";
      toast.error(message);
    } finally {
      setChangingRole(false);
    }
  };

  const handleRoleDialogOpen = () => {
    setSelectedRole((employee?.role as "admin" | "employee" | "client" | "manager") || "employee");
    setShowRoleDialog(true);
  };

  const handleUploadAttachments = async () => {
    if (newAttachments.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    try {
      setUploadingAttachments(true);
      const response = await uploadEmployeeAttachments(employeeId, newAttachments);

      if (response && response.success) {
        const uploadedAttachments = response.data.attachments;

        // Filter out any invalid attachments
        const validAttachments = Array.isArray(uploadedAttachments)
          ? uploadedAttachments.filter(att => att && att.filename && att.originalName)
          : [];

        setAttachments(validAttachments);
        setNewAttachments([]);
        toast.success(`${response.data.newAttachments?.length || 0} attachment(s) uploaded successfully`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload attachments";
      toast.error(message);
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleRemoveAttachment = async (filename: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    try {
      const response = await removeEmployeeAttachment(employeeId, filename);

      if (response && response.success) {
        const remainingAttachments = response.data.remainingAttachments;
        setAttachments(Array.isArray(remainingAttachments) ? remainingAttachments : []);
        toast.success("Attachment removed successfully");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove attachment";
      toast.error(message);
    }
  };

  const handleDownloadAttachment = async (filename: string, originalName: string) => {
    try {
      const token = localStorage.getItem('token');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const downloadUrl = `${backendUrl}/employee/${employeeId}/download-attachment/${filename}`;

      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = `${downloadUrl}?token=${token}`;
      a.download = originalName || filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Download started");
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  const handleViewAttachment = async (filename: string, path: string) => {
    try {
      // Always use the backend endpoint to get a proper signed URL
      const token = localStorage.getItem('token');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const viewUrl = `${backendUrl}/employee/${employeeId}/view-attachment/${filename}?token=${token}`;
      window.open(viewUrl, '_blank');
    } catch (error) {
      console.error('Error viewing attachment:', error);
      toast.error('Failed to view attachment');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimetype: string | undefined) => {
    if (!mimetype) return "📎";
    if (mimetype.startsWith("image/")) return "🖼️";
    if (mimetype.includes("pdf")) return "📄";
    if (mimetype.includes("word")) return "📝";
    if (mimetype.includes("excel") || mimetype.includes("spreadsheet")) return "📊";
    return "📎";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not provided";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Employee not found</p>
      </div>
    );
  }

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Employees", href: "/admin/employees" },
          { label: employee.fullName },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/employees")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
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
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{employee.fullName}</h1>
                <p className="text-muted-foreground">{employee.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deactivate Employee
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRoleDialogOpen}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Change Role
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Basic employee information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    placeholder="Enter full name"
                  />
                ) : (
                  <p className="text-sm font-medium">{employee.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter email address"
                  />
                ) : (
                  <p className="text-sm font-medium">{employee.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                {isEditing ? (
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                    placeholder="Enter contact number"
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {employee.personalInfo?.contactNumber || "Not provided"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                {isEditing ? (
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleInputChange("dob", e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {formatDate(employee.personalInfo?.dob || null)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter address"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {employee.personalInfo?.address || "Not provided"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                {isEditing ? (
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant={
                      employee.status === "active" ? "default" : "secondary"
                    }
                  >
                    {employee.status}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card>
            <CardHeader>
              <CardTitle>Work Information</CardTitle>
              <CardDescription>
                Employment details and work-related information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                {isEditing ? (
                  <DepartmentManager
                    value={formData.department ?? ""}
                    onValueChange={(value) => handleInputChange("department", value)}
                    placeholder="Select department"
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {employee.personalInfo?.department || "Not provided"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                {isEditing ? (
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    placeholder="Enter position"
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {employee.personalInfo?.position || "Not provided"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportingManager">Reporting Manager</Label>
                {isEditing ? (
                  <Input
                    id="reportingManager"
                    value={formData.reportingManager}
                    onChange={(e) => handleInputChange("reportingManager", e.target.value)}
                    placeholder="Enter reporting manager"
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {employee.personalInfo?.reportingManager || "Not provided"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Join Date
                </Label>
                <p className="text-sm font-medium">
                  {formatDate(employee.personalInfo?.startDate || null)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Employee ID
                </Label>
                <p className="text-sm font-medium">#{employee.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attachments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Employee Attachments
            </CardTitle>
            <CardDescription>
              {isEditing
                ? "Upload, view, and manage employee documents (contracts, certificates, etc.)"
                : "View and download employee documents (contracts, certificates, etc.)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload New Attachments - Only show in edit mode */}
            {isEditing && (
              <div className="space-y-3">
                <Label htmlFor="newAttachments">Upload New Attachments</Label>
                <div className="flex gap-2">
                  <Input
                    id="newAttachments"
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setNewAttachments(Array.from(e.target.files));
                      }
                    }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUploadAttachments}
                    disabled={uploadingAttachments || newAttachments.length === 0}
                  >
                    {uploadingAttachments ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
                {newAttachments.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {newAttachments.length} file(s) selected
                  </p>
                )}
              </div>
            )}

            {/* Existing Attachments */}
            {attachments && attachments.length > 0 ? (
              <div className="space-y-2">
                <Label>{isEditing ? "Existing Attachments" : "Employee Attachments"} ({attachments.length})</Label>
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={attachment.filename || `attachment-${index}`}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {getFileIcon(attachment.mimetype)}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {attachment.originalName || attachment.filename || "Unknown file"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size || 0)} • Uploaded{" "}
                            {attachment.uploadedAt ? new Date(attachment.uploadedAt).toLocaleDateString() : "Unknown date"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAttachment(attachment.filename, attachment.path)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-100"
                          title="View attachment"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment.filename, attachment.originalName || attachment.filename)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                          title="Download attachment"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {isEditing && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(attachment.filename)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete attachment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No attachments uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Employee</DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                Are you sure you want to deactivate <strong>{employee?.fullName}</strong>?
              </p>
              <p>This disables account access and preserves employee records, payroll history, projects and tasks.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={handlePasswordDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Employee Password</DialogTitle>
            <DialogDescription>
              Set a new password for {employee?.fullName}. The employee will be able to use this new password to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={changingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={changingPassword}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={changingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={changingPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handlePasswordDialogClose}
              disabled={changingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Employee Role</DialogTitle>
            <DialogDescription>
              Update access level and permissions for {employee?.fullName}. This will change their system access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as "admin" | "employee" | "client" | "manager")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-blue-50 border-blue-200 p-4 text-sm text-blue-800">
              <p><strong>Current Role:</strong> {employee?.role}</p>
              {selectedRole !== employee?.role && (
                <p className="mt-2"><strong>Updated Role:</strong> {selectedRole}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)} disabled={changingRole}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={changingRole || !selectedRole}>
              {changingRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
