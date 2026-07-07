// src/routes/admin.change-password.tsx
import { useState } from "react";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/change-password")({
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { logout, token } = useAuth();
  const navigate = useNavigate();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast.error("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      // Assume a Django endpoint exists that validates the old password and returns a new token
      const res = await fetch(`${process.env.VITE_API_URL}/admin/change_password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      // Expect the backend to return a refreshed JWT token
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        toast.success("Password changed successfully");
        navigate({ to: "/admin" });
      } else {
        toast.success("Password changed successfully");
        // force logout to force re‑login with new credentials
        logout();
        navigate({ to: "/admin/login" });
      }
    } catch (err) {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-md p-6">
      <h2 className="mb-4 text-center text-2xl font-display">Change Admin Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Current Password</label>
          <input
            type="password"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">New Password</label>
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm New Password</label>
          <input
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-primary px-4 py-2 font-semibold text-primary-foreground hover:brightness-110"
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
