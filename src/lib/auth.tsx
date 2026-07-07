import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "sonner";

interface AuthContextProps {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) setToken(stored);
  }, []);

  const login = async (username: string, password: string) => {
    const adminUser = import.meta.env.VITE_ADMIN_USERNAME as string;
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD as string;
    if (username === adminUser && password === adminPass) {
      const fakeToken = "admin-token";
      localStorage.setItem("authToken", fakeToken);
      setToken(fakeToken);
      toast.success("Logged in as admin");
    } else {
      toast.error("Invalid admin credentials");
      throw new Error("Invalid credentials");
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    toast.success("Logged out");
  };

  const value: AuthContextProps = { token, isAuthenticated: !!token, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
