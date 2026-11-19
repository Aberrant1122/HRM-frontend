"use client";

import { useState, useEffect } from "react";
import {
  getDepartments,
  createDepartment as apiCreateDepartment,
  deleteDepartment as apiDeleteDepartment,
  type Department,
} from "@/lib/actions/department.actions";

export { type Department } from "@/lib/actions/department.actions";

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load departments from API on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {

    try {
      const result = await getDepartments();
      if (result.data) {
        setDepartments(result.data);
      } else if (result.error) {
        console.error("Error loading departments:", result.error);
        // Set empty array on error
        setDepartments([]);
      }
    } catch (error) {
      console.error("Error loading departments:", error);
      setDepartments([]);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const addDepartment = async (name: string, description?: string): Promise<{ success: boolean; message: string; archivedDepartment?: Department }> => {
    if (!name.trim()) {
      return { success: false, message: "Department name is required" };
    }

    // Client-side duplicate check (case-insensitive) to avoid unnecessary API calls
    const trimmed = name.trim();
    const exists = departments.some(
      (dept) => dept.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return { success: false, message: "Department already exists" };
    }

    setIsLoading(true);

    try {
      const result = await apiCreateDepartment(trimmed, description?.trim());
      
      if (result.data) {
        // Add the new department to the local state
        setDepartments((prev) => [...prev, result.data!]);
        const msg = result.status === 200 ? "Department restored successfully" : "Department added successfully";
        return { success: true, message: msg };
      } else {
        return { success: false, message: result.error || "Failed to add department", archivedDepartment:result.archivedDepartment };
      }
    } catch (error) {
      console.error("Error adding department:", error);
      return { success: false, message: "Failed to add department" };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDepartment = async (id: number): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);

    try {
      const result = await apiDeleteDepartment(id);
      
      if (result.success) {
        // Remove the department from local state
        setDepartments((prev) => prev.filter((dept) => dept.id !== id));
        return { success: true, message: "Department deleted successfully" };
      } else {
        return { success: false, message: result.error || "Failed to delete department" };
      }
    } catch (error) {
      console.error("Error deleting department:", error);
      return { success: false, message: "Failed to delete department" };
    } finally {
      setIsLoading(false);
    }
  };

  const getDepartmentByName = (name: string): Department | undefined => {
    const query = name?.toLowerCase();
    return departments.find((dept) => dept.name.toLowerCase() === query);
  };

  const getDepartmentById = (id: number): Department | undefined => {
    return departments.find((dept) => dept.id === id);
  };

  const refreshDepartments = async () => {
    await loadDepartments();
  };

  return {
    departments,
    isLoading,
    isInitialLoading,
    addDepartment,
    deleteDepartment,
    getDepartmentByName,
    getDepartmentById,
    refreshDepartments,
  };
}
