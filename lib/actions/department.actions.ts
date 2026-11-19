import { getAuthToken } from "../auth/token";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api").replace(/\/+$/, "");

export interface Department {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  archivedDepartment?: Department;
}

// Get all active departments
export async function getDepartments(): Promise<{
  data?: Department[];
  error?: string;
  status?: number;
}> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: "No authentication token found" };
    }

    const response = await fetch(`${API_BASE_URL}/departments`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.message || "Failed to fetch departments",
        status: response.status,
      };
    }

    const result: ApiResponse<Department[]> = await response.json();
    return { data: result.data || [] };
  } catch (error) {
    console.error("Error fetching departments:", error);
    return { error: "Failed to fetch departments" };
  }
}

// Create a new department
export async function createDepartment(
  name: string,
  description?: string
): Promise<{
  data?: Department;
  error?: string;
  status?: number;
  archivedDepartment?: Department;
}> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: "No authentication token found" };
    }

    const response = await fetch(`${API_BASE_URL}/departments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, description }),
    });

    const result: ApiResponse<Department> = await response.json();

    if (!response.ok) {
      return {
        error: result.message || "Failed to create department",
        archivedDepartment: result.archivedDepartment,
        status: response.status,
      };
    }

    return { data: result.data, status: response.status };
  } catch (error) {
    console.error("Error creating department:", error);
    return { error: "Failed to create department" };
  }
}

// Update a department
export async function updateDepartment(
  id: number,
  name: string,
  description?: string
): Promise<{
  data?: Department;
  error?: string;
  status?: number;
}> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: "No authentication token found" };
    }

    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, description }),
    });

    const result: ApiResponse<Department> = await response.json();

    if (!response.ok) {
      return {
        error: result.message || "Failed to update department",
        status: response.status,
      };
    }

    return { data: result.data };
  } catch (error) {
    console.error("Error updating department:", error);
    return { error: "Failed to update department" };
  }
}

// Delete a department (soft delete)
export async function deleteDepartment(id: number): Promise<{
  success?: boolean;
  error?: string;
  status?: number;
}> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: "No authentication token found" };
    }

    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result: ApiResponse<null> = await response.json();

    if (!response.ok) {
      return {
        error: result.message || "Failed to delete department",
        status: response.status,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting department:", error);
    return { error: "Failed to delete department" };
  }
}

// Get all departments (including inactive) - Admin only
export async function getAllDepartmentsAdmin(): Promise<{
  data?: Department[];
  error?: string;
  status?: number;
}> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: "No authentication token found" };
    }

    const response = await fetch(`${API_BASE_URL}/departments/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.message || "Failed to fetch all departments",
        status: response.status,
      };
    }

    const result: ApiResponse<Department[]> = await response.json();
    return { data: result.data || [] };
  } catch (error) {
    console.error("Error fetching all departments:", error);
    return { error: "Failed to fetch all departments" };
  }
}

// Restore a deleted department
export async function restoreDepartment(id: number): Promise<{
  success?: boolean;
  error?: string;
  status?: number;
}> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: "No authentication token found" };
    }

    const response = await fetch(`${API_BASE_URL}/departments/${id}/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result: ApiResponse<null> = await response.json();

    if (!response.ok) {
      return {
        error: result.message || "Failed to restore department",
        status: response.status,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error restoring department:", error);
    return { error: "Failed to restore department" };
  }
}
