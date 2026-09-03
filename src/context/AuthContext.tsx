import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ClientProfile {
  id: number;
  phone: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  status_display: string;
  created_by_psychologist: boolean;
  notes: string;
  created_at: string;
  approved_at: string | null;
}

export interface AuthContextType {
  user: User | null;
  role: "psychologist" | "client" | "user" | null;
  isApproved: boolean;
  clientProfile: ClientProfile | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string; role?: string }>;
  register: (data: { first_name: string; last_name: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"psychologist" | "client" | "user" | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // CSRF Token alma
  const getCsrfToken = () => {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  };

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me/", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          setRole(data.role);
          setIsApproved(data.is_approved);
          setClientProfile(data.client_profile || null);
        } else {
          setUser(null);
          setRole(null);
          setIsApproved(false);
          setClientProfile(null);
        }
      }
    } catch (e) {
      console.error("Auth check failed:", e);
      setUser(null);
      setRole(null);
      setIsApproved(false);
      setClientProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ username: identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || "Giriş yapılamadı." };
      }

      setUser(data.user);
      setRole(data.role);
      setIsApproved(data.is_approved);
      setClientProfile(data.client_profile || null);
      return { success: true, message: data.message, role: data.role };
    } catch (e) {
      return { success: false, message: "Bağlantı hatası oluştu." };
    }
  };

  const register = async (data: { first_name: string; last_name: string; email: string; phone: string; password: string }) => {
    try {
      const res = await fetch("/api/auth/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        const errorMsg = Object.values(resData).flat().join(" ") || "Kayıt oluşturulamadı.";
        return { success: false, message: errorMsg };
      }

      return { success: true, message: resData.message };
    } catch (e) {
      return { success: false, message: "Bağlantı hatası oluştu." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setUser(null);
      setRole(null);
      setIsApproved(false);
      setClientProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isApproved,
        clientProfile,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
