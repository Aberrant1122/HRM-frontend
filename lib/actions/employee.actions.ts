import type { EmployeeAccountSummary } from "@/lib/types/employee.types";
import { getAuthToken } from "@/lib/auth/token";
import {
  EmployeesResponse,
  InviteEmployeeBody,
  InviteEmployeeResponse,
  Attachment,
} from "@/lib/types/employee.types";
import { BankInfo, BankInfoResponse } from "@/lib/types/user.types";
import { UpdateBankDetailsResponse } from "@/lib/types/bank.types";
import { EmployeeInfoResponse } from "@/lib/types/employee.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api";

// Helper function to ensure proper URL construction
const getApiUrl = (endpoint: string) => {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  return `${baseUrl}${endpoint}`;
};

export const getAllEmployees = async (page: number = 1, limit: number = 10, filters: { search?: string; status?: string } = {}): Promise<EmployeesResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  const response = await fetch(getApiUrl(`employee/all?${params}`), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch employees");
  }

  const data = await response.json();
  return data;
};

interface UpdateStatusResponse {
  success: boolean;
  data: {
    id: number;
    status: "active" | "inactive" | "suspended";
    updatedAt: string;
  };
}
export const getAllUsers = async (page: number = 1, limit: number = 10): Promise<EmployeesResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(getApiUrl(`employee/all?page=${page}&limit=${limit}`), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch users");
  }

  const data = await response.json();
  return data;
};
export const updateEmployeeStatus = async (
  employeeId: number,
  status: "active" | "inactive" | "suspended"
): Promise<UpdateStatusResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(getApiUrl(`employee/${employeeId}/status`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update employee status");
  }

  return response.json();
};

export const getEmployeeBankDetails = async (employeeId: number) => {
  const token = await getAuthToken();
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!API_BASE_URL) {
    throw new Error("Backend URL is not configured");
  }

  try {
    const response = await fetch(
      getApiUrl(`employee/${employeeId}/get-bank-details`),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to fetch bank details");
    }

    const data = await response.json();

    // Transform the API response to match our form structure
    if (data.success && data.data) {
      return {
        ...data.data,
        // Map IBAN to iban for the form
        iban: data.data.IBAN || "",
      };
    }

    return null;
  } catch (error) {
    throw error;
  }
};

export const inviteEmployee = async (
  employeeData: InviteEmployeeBody
): Promise<InviteEmployeeResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const url = getApiUrl('auth/invite-employee');

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(employeeData),
    });

    const responseText = await response.text();

    let errorData;
    try {
      errorData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      errorData = { message: "Invalid JSON response from server" };
    }

    if (!response.ok) {
      if (errorData.errors && Array.isArray(errorData.errors)) {
        interface ValidationError {
          field?: string;
          message?: string;
        }

        const errorMessages = (errorData.errors as ValidationError[]).map(
          (err) =>
            `${err.field ? `${err.field}: ` : ""}${err.message || "Validation error"
            }`
        );
        const errorMessage = errorMessages.join("\n");
        throw new Error(errorMessage);
      }

      const errorMessage =
        errorData.message || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return errorData as InviteEmployeeResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to invite employee: ${error.message}`);
    }
    throw new Error("An unknown error occurred while inviting employee");
  }
};

export const EmployeeBankInfo = async (
  employeeId: number,
  bankInfo: BankInfo
): Promise<BankInfoResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  try {
    const response = await fetch(
      getApiUrl(`employee/${employeeId}/add-bank-details`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bankInfo),
      }
    );

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        responseData.message || "Failed to save bank information"
      );
    }

    return responseData;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to save bank information";
    throw new Error(errorMessage);
  }
};

export const updateEmployeeBankDetails = async (
  employeeId: number,
  bankDetails: Partial<BankInfo>
): Promise<UpdateBankDetailsResponse> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(
    getApiUrl(`employee/${employeeId}/update-bank-details`),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bankDetails),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update bank details");
  }

  return response.json();
};

export const getEmployeeInfoById = async (
  employeeId: number
): Promise<EmployeeInfoResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(
    getApiUrl(`employee/${employeeId}/user-info`),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || "Failed to fetch employee information"
    );
  }

  return response.json();
};

export const uploadEmployeeAttachments = async (
  employeeId: number,
  files: File[]
): Promise<{ success: boolean; data: { attachments: Attachment[]; newAttachments: Attachment[] } }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("attachments", file);
  });

  const response = await fetch(getApiUrl(`employee/${employeeId}/attachments`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to upload attachments");
  }

  return response.json();
};

export const getEmployeeAttachments = async (
  employeeId: number
): Promise<Attachment[]> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await getEmployeeInfoById(employeeId);

  if (response && response.success && response.data) {
    // Attachments are stored in userInfo
    return response.data.personalInfo?.attachments || [];
  }

  return [];
};

export const removeEmployeeAttachment = async (
  employeeId: number,
  attachmentId: string
): Promise<{ success: boolean; data: { removedAttachment: Attachment; remainingAttachments: Attachment[] } }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(getApiUrl(`employee/${employeeId}/attachments/${attachmentId}`), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to remove attachment");
  }

  return response.json();
};

export interface UpdateProfileData {
  fullName?: string;
  contactNumber?: string;
  address?: string;
  dob?: string;
  department?: string;
  position?: string;
  reportingManager?: string;
}

export const updateEmployeeProfile = async (
  employeeId: number,
  profileData: UpdateProfileData
): Promise<EmployeeInfoResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(getApiUrl(`employee/${employeeId}/profile`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update profile");
  }

  return response.json();
};

export const uploadProfilePicture = async (
  employeeId: number,
  file: File
): Promise<{ success: boolean; data: { profilePicture: string } }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await fetch(getApiUrl(`employee/${employeeId}/profile-picture`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to upload profile picture");
  }

  return response.json();
};

export const deleteProfilePicture = async (
  employeeId: number
): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(getApiUrl(`employee/${employeeId}/profile-picture`), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete profile picture");
  }

  return response.json();
};

export interface UpdateEmployeeData {
  fullName?: string;
  email?: string;
  status?: string;
  contactNumber?: string;
  address?: string;
  dob?: string;
  department?: string;
  position?: string;
  reportingManager?: string;
}

export const updateEmployee = async (
  employeeId: number,
  updateData: UpdateEmployeeData
): Promise<EmployeeInfoResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  // Remove undefined, null, and empty string values
  const cleanedData: Record<string, unknown> = {};
  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanedData[key] = value;
    }
  });


  const response = await fetch(getApiUrl(`employee/${employeeId}/profile`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cleanedData),
  });


  if (!response.ok) {
    let errorData: { message?: string; errors?: { field: string; message: string }[] } = {};
    const contentType = response.headers.get('content-type');

    try {
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        const text = await response.text();
        errorData = { message: text || 'Unknown error' };
      }
    } catch (e) {
      errorData = { message: 'Failed to parse error response' };
    }


    // Show detailed validation errors if available
    if (errorData.errors && Array.isArray(errorData.errors)) {
      const errorMessages = errorData.errors.map((e) =>
        `${e.field}: ${e.message}`
      ).join(', ');
      throw new Error(errorMessages || errorData.message || "Failed to update employee");
    }

    throw new Error(errorData.message || `Failed to update employee (Status: ${response.status})`);
  }

  return response.json();
};

export const deleteEmployee = async (employeeId: number): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(getApiUrl(`employee/${employeeId}`), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete employee");
  }

  return response.json();
};

export interface ChangeEmployeePasswordResponse {
  message: string;
}

export const changeEmployeePassword = async (
  employeeId: number,
  newPassword: string
): Promise<ChangeEmployeePasswordResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(getApiUrl(`employee/${employeeId}/password`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to change password");
  }

  return response.json();
};

export interface UpdateEmployeeRoleResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    fullName: string;
    email: string;
    role: string;
    oldRole: string;
  };
}

export const updateEmployeeRole = async (
  employeeId: number,
  role: "admin" | "employee" | "client" | "manager"
): Promise<UpdateEmployeeRoleResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(getApiUrl(`employee/${employeeId}/role`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update role");
  }

  return response.json();
};

export const getEmployeeAccountSummary = async (): Promise<EmployeeAccountSummary> => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found");
  const response = await fetch(getApiUrl("employee/account-summary"), {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error("Account summary unavailable");
  const result = await response.json();
  if (!result.success || !result.data) throw new Error("Account summary unavailable");
  return result.data;
};
