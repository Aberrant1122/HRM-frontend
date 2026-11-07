"use client";
import {LeavePolicyProfile} from "@/components/leave-policy-profile";

import { formatCalendarDate } from "@/lib/calendar-date";

import { Edit, Phone, Mail, MapPin, Calendar, Building, Loader2, Camera, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getEmployeeInfoById,
  updateEmployeeProfile,
  UpdateProfileData,
  uploadProfilePicture,
  deleteProfilePicture
} from "@/lib/actions/employee.actions";
import { EmployeeInfoResponse } from "@/lib/types/employee.types";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth/token";

export default function EmployeeProfilePage() {
  const [employee, setEmployee] = useState<EmployeeInfoResponse["data"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [formData, setFormData] = useState<UpdateProfileData>({
    fullName: "",
    contactNumber: "",
    address: "",
    dob: "",
  });

  useEffect(() => {
    // Get user data from localStorage
    const fetchUserId = () => {
      if (typeof window === "undefined") return;

      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user?.id) {
            setEmployeeId(Number(user.id));
          } else {
            toast.error("User information not found. Please log in again.");
          }
        } catch (error) {
          toast.error("Error loading user information");
        }
      } else {
        toast.error("Please log in to view this page");
        router.push("/login");
      }
    };

    fetchUserId();
  }, [router]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!employeeId) return;

      try {
        setLoading(true);
        const response = await getEmployeeInfoById(employeeId);
        if (response && response.success) {
          setEmployee(response.data);
          // Initialize form data
          setFormData({
            fullName: response.data.fullName || "",
            contactNumber: response.data.personalInfo?.contactNumber || "",
            address: response.data.personalInfo?.address || "",
            dob: response.data.personalInfo?.dob || "",
          });
        } else {
          throw new Error("Failed to load employee data");
        }
      } catch (error) {
        toast.error("Failed to load employee profile");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [employeeId]);

  const handleEditClick = () => {
    if (employee) {
      setFormData({
        fullName: employee.fullName || "",
        contactNumber: employee.personalInfo?.contactNumber || "",
        address: employee.personalInfo?.address || "",
        dob: employee.personalInfo?.dob || "",
      });
    }
    setIsEditDialogOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId) {
      toast.error("Employee ID not found");
      return;
    }

    try {
      setSaving(true);
      const response = await updateEmployeeProfile(employeeId, formData);

      if (response && response.success) {
        toast.success("Profile updated successfully");
        setEmployee(response.data);
        setIsEditDialogOpen(false);
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employeeId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    try {
      setUploadingPicture(true);
      const response = await uploadProfilePicture(employeeId, file);

      if (response && response.success) {
        toast.success("Profile picture updated successfully");
        // Update employee state with new profile picture
        setEmployee(prev => prev ? { ...prev, profilePicture: response.data.profilePicture } : null);

        // Reset the file input so the same file can be selected again if needed
        e.target.value = '';
      } else {
        throw new Error("Failed to upload profile picture");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload profile picture"
      );
      // Reset the file input on error too
      e.target.value = '';
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!employeeId || !employee?.profilePicture) return;

    try {
      setUploadingPicture(true);
      const response = await deleteProfilePicture(employeeId);

      if (response && response.success) {
        toast.success("Profile picture removed successfully");
        setEmployee(prev => prev ? { ...prev, profilePicture: null } : null);
      } else {
        throw new Error("Failed to remove profile picture");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove profile picture"
      );
    } finally {
      setUploadingPicture(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No employee data found</p>
      </div>
    );
  }

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Employee", href: "/employee" },
          { label: "My Information" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="mb-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            My Information
          </h2>
          <p className="text-gray-600">
            View and manage your personal and work details
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="relative inline-block mb-4">
                <Avatar
                  key={employee?.profilePicture || 'no-picture'}
                  className="h-24 w-24 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => employee?.profilePicture && setIsImagePreviewOpen(true)}
                >
                  {employee?.profilePicture ? (
                    <AvatarImage
                      src={employee.profilePicture}
                      alt={employee.fullName}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="text-2xl">
                    {employee?.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 flex gap-1">
                  <label htmlFor="profile-picture-upload" className="cursor-pointer">
                    <div className="bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors">
                      {uploadingPicture ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </div>
                  </label>
                  <input
                    id="profile-picture-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureChange}
                    disabled={uploadingPicture}
                  />
                  {employee?.profilePicture && (
                    <button
                      onClick={handleDeleteProfilePicture}
                      disabled={uploadingPicture}
                      className="bg-destructive text-destructive-foreground rounded-full p-2 hover:bg-destructive/90 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <CardTitle className="text-xl">{employee?.fullName}</CardTitle>
              <CardDescription>
                {employee?.personalInfo?.position}
              </CardDescription>
              <Button
                className="mt-4"
                variant="outline"
                onClick={handleEditClick}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-gray-600">
                      {employee?.personalInfo?.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Join Date</p>
                    <p className="text-sm text-gray-600">
                      {formatCalendarDate(employee?.personalInfo?.startDate)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your personal contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Email Address</p>
                      <p className="text-sm text-gray-600">{employee?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Phone Number</p>
                      <p className="text-sm text-gray-600">
                        {employee?.personalInfo?.contactNumber || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-gray-600">
                      {employee?.personalInfo?.address || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Information */}
            <Card>
              <CardHeader>
                <CardTitle>Work Information</CardTitle>
                <CardDescription>
                  Your employment and work details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Position
                    </p>
                    <p className="text-sm text-gray-600">
                      {employee?.personalInfo?.position || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Department
                    </p>
                    <p className="text-sm text-gray-600">
                      {employee?.personalInfo?.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Manager</p>
                    <p className="text-sm text-gray-600">
                      {employee?.personalInfo?.reportingManager || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Join Date
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCalendarDate(employee?.personalInfo?.startDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>
                  Contact person in case of emergency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-sm text-gray-600">
                      {mockEmployee.emergencyContact.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Relationship
                    </p>
                    <p className="text-sm text-gray-600">
                      {mockEmployee.emergencyContact.relationship}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Phone Number
                    </p>
                    <p className="text-sm text-gray-600">
                      {mockEmployee.emergencyContact.phone}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="Enter your contact number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profile Picture Preview Dialog */}
      <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Profile Picture</DialogTitle>
            <DialogDescription>
              View {employee?.fullName}&apos;s profile picture
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-[500px]">
            <button
              onClick={() => setIsImagePreviewOpen(false)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            {employee?.profilePicture ? (
              <Image
                src={employee.profilePicture}
                alt={employee.fullName}
                fill
                unoptimized
                sizes="(max-width: 800px) 100vw, 800px"
                className="object-contain rounded-lg"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted">
                <p className="text-muted-foreground">No profile picture</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-muted">
            <p className="text-center font-medium">{employee?.fullName}</p>
            <p className="text-center text-sm text-muted-foreground">
              {employee?.personalInfo?.position}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    {employeeId&&<LeavePolicyProfile key={employeeId} employeeId={employeeId} admin={false}/>}</>
  );
}
import Image from "next/image";
