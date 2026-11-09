"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type UserType = {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  token?: string;
  role?: string;
  profilePicture?: string;
};

const AuthContext = createContext<any>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isProfileFetched, setIsProfileFetched] = useState(false);
  const fetchingRef = React.useRef(false); // Prevent concurrent fetches

  const fetchProfile = useCallback(async (userId: string, token: string) => {
    // Prevent duplicate concurrent requests
    if (fetchingRef.current) {
      return null;
    }

    try {
      fetchingRef.current = true;
      const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005/api";
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
      const response = await fetch(`${baseUrl}employee/${userId}/user-info`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const updatedUser = {
            id: data.data.id.toString(),
            fullName: data.data.fullName,
            email: data.data.email,
            profilePicture: data.data.profilePicture,
            role: data.data.role,
            token: token
          };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          return updatedUser;
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      fetchingRef.current = false;
    }
    return null;
  }, []);

  useEffect(() => {
    if (isProfileFetched) return; // Prevent multiple fetches
    
    const token = localStorage.getItem("token");
    if (user?.id && token && !user.fullName) {
      // Only fetch if we don't have full profile data
      fetchProfile(user.id, token).then(() => {
        setIsProfileFetched(true);
      });
    } else {
      setIsProfileFetched(true);
    }
  }, []); // Empty dependency array - run once on mount

  const login = (userData: UserType) => {
    setUser(userData);
    if (typeof window !== "undefined") {
      localStorage.setItem("token", userData.token || "");
      localStorage.setItem("user", JSON.stringify(userData));
    }

    const role = (userData.role || "employee").toString().toLowerCase();

    if (role === "admin") {
      router.push("/admin/dashboard");
    } else if (role === "hr") {
      router.push("/employee-documents");
    } else if (role === "manager") {
      router.push("/manager/dashboard");
    } else if (role === "client") {
      router.push("/client/dashboard");
    } else {
      router.push("/employee/dashboard");
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    router.push("/login");
  };

  const refreshProfile = useCallback(() => {
    if (user?.id && user?.token) {
      return fetchProfile(user.id, user.token);
    }
    return Promise.resolve(null);
  }, [user?.id, user?.token, fetchProfile]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      refreshProfile, 
      token: user?.token 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
