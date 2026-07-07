// src/routes/-__protected.tsx
// This file is intentionally ignored by the router (starts with '-')
// It contains the same ProtectedRoute component for reference.
import { useAuth } from "../lib/auth";
import { Navigate } from "@tanstack/react-router";
import { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
