export interface Attachment {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
}

export interface EmployeeAccountSummary {
  scope: { role: "employee"; filters: "none"; pagination: "all-pages"; basis: "login-account-role" };
  counts: { total: number; active: number; inactive: number; suspended: number; unknown: number };
  departments: { activeConfigurations: number };
  generatedAt: string;
}

export interface UserInfo {
  id: number;
  employeeId: number;
  phone?: string;
  contactNumber?: string;
  address?: string;
  dob?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  attachments?: Attachment[];
}

export interface Employee {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  lastLogin: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profilePicture?: string | null;
  userInfo: UserInfo | null;
}

export interface EmployeesResponse {
  success: boolean;
  data: Employee[];
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface EmployeeFormData {
  // Personal Information
  fullName: string;
  email: string;
  contactNumber: string;
  cnic: string;
  dob: string;
  address: string;

  // Work Information
  employeeId: string;
  department: string;
  position: string;
  reportingManager: string;
  startDate: string;
  team: string;
  employmentType: string;
  salary: string | number;
  probationEndDate: string;

  // Bank Information
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branchCode: string;
  branchAddress: string;

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;

  // Additional Information
  notes: string;

  // Attachments
  attachments: File[];
}

export const initialEmployeeFormData: EmployeeFormData = {
  // Personal Information
  fullName: "",
  email: "",
  contactNumber: "",
  cnic: "",
  dob: "",
  address: "",

  // Work Information
  employeeId: "",
  department: "",
  position: "",
  reportingManager: "",
  startDate: "",
  team: "",
  employmentType: "",
  salary: "",
  probationEndDate: "",

  // Bank Information
  bankName: "",
  accountTitle: "",
  accountNumber: "",
  iban: "",
  branchCode: "",
  branchAddress: "",

  // Emergency Contact
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",

  // Additional Information
  notes: "",

  // Attachments
  attachments: [],
};

export interface InviteEmployeeBody {
  fullName: string;
  email: string;
  role: string;
  cnic: string;
  contactNumber: string;
  address: string;
  dob: string;
  startDate: string;
  department: string;
  reportingManager: string;
  probationEndDate: string;
  employmentStatus: string;
  salary: number;
  designation: string;
  team: string;
}

export interface InviteEmployeeResponse {
  message: string;
  userId: number;
  resetToken: string;
}

export interface EmployeeInfoResponse {
  success: boolean;
  data: {
    id: number;
    fullName: string;
    email: string;
    role: string;
    status: string;
    lastLogin: string | null;
    createdAt: string;
    updatedAt: string;
    profilePicture?: string | null;
    personalInfo: {
      contactNumber: string;
      address: string;
      startDate: string;
      department: string;
      probationEndDate: string;
      dob: string;
      reportingManager: string;
      cnic: string;
      employmentStatus: string;
      salary: number;
      position: string;
      team: string;
      attachments?: Attachment[];
    };
  };
}
