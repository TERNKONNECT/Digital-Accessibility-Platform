"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  UserCheck,
  UserMinus,
  UserPlus
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AdminResponse, AdminUser, API_URL, authHeaders } from "@/lib/platform";

const USER_FILTER_LABELS = {
  all: "All Accounts",
  solo: "Solo Users",
  org: "Organizations",
  superadmin: "Superadmins",
  suspended: "Suspended",
} as const;

export default function UserManagementPage() {
  const { token, inviteSuperadmin } = useAuthStore();
  const [admin, setAdmin] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter and Search State
  const [userQuery, setUserQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "solo" | "org" | "superadmin" | "suspended">("all");

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite superadmin state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const response = await axios.get(`${API_URL}/platform/admin`, { headers: authHeaders(token) });
      setAdmin(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load users data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSetUserStatus(id: string, currentStatus: string) {
    if (!token) return;
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    setActionLoading(`user-status-${id}`);
    try {
      await axios.patch(
        `${API_URL}/platform/admin/users/${id}/status`,
        { status: nextStatus },
        { headers: authHeaders(token) }
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to update user status.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleInviteSuperadmin(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteMessage("");
    setInviting(true);
    try {
      const res = await inviteSuperadmin(inviteName, inviteEmail);
      setInviteMessage(res.tempPassword ? `${res.message} Temp password: ${res.tempPassword}` : res.message);
      setInviteName("");
      setInviteEmail("");
      await load();
    } catch (err: any) {
      setInviteError(err.message || "Failed to invite superadmin.");
    } finally {
      setInviting(false);
    }
  }

  const filteredUsers = useMemo(() => {
    if (!admin) return [];
    let list = admin.users;

    if (userQuery.trim()) {
      const q = userQuery.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }

    if (userFilter === "solo") {
      list = list.filter(u => u.role === "solo");
    } else if (userFilter === "org") {
      list = list.filter(u => u.role === "org_admin" || u.role === "org_user");
    } else if (userFilter === "superadmin") {
      list = list.filter(u => u.role === "superadmin");
    } else if (userFilter === "suspended") {
      list = list.filter(u => u.status === "suspended");
    }

    return list;
  }, [admin, userQuery, userFilter]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;

  if (error || !admin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-950/20 dark:bg-red-950/10">
        <h3 className="font-semibold text-lg">Error Loading Users</h3>
        <p className="mt-1 text-sm">{error || "Could not retrieve user catalog."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">User Management</h1>
          <p className="text-zinc-500 mt-1.5">Manage user directories, roles, status, and active product access licenses.</p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent)] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Superadmin
        </button>
      </div>

      {showInviteForm && (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Invite Superadmin</h3>
          {inviteError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{inviteError}</div>}
          {inviteMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{inviteMessage}</div>}
          <form onSubmit={handleInviteSuperadmin} className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Name</label>
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={inviting}
                className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
              >
                {inviting ? "Inviting..." : "Send Invite"}
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs text-zinc-400">They&apos;ll receive a temporary password by email and must set a new one on first login.</p>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex border border-[var(--border)] rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950/40 p-1 gap-1">
            {(["all", "solo", "org", "superadmin", "suspended"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setUserFilter(filter)}
                className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                  userFilter === filter
                    ? "bg-white text-[var(--foreground)] shadow dark:bg-zinc-800"
                    : "text-zinc-500 hover:text-[var(--foreground)]"
                }`}
              >
                {USER_FILTER_LABELS[filter]}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input 
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-transparent pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" 
              placeholder="Search user name or email..." 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-400 border-b border-[var(--border)]">
              <tr>
                <th className="pb-3 font-semibold">User Details</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Subscription Details</th>
                <th className="pb-3 font-semibold">Account Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item: AdminUser) => {
                const planDetails = item.subscription?.planDetails;
                const isPlanActive = planDetails && planDetails.status === "active";
                const isSuperAdmin = item.role === "superadmin";
                const planName = isSuperAdmin ? "Super Admin (Unlimited)" : (isPlanActive ? planDetails.name : "None");
                const nextBillingDate = isSuperAdmin ? "Continuous Access" : (isPlanActive && item.subscription?.endsAt ? new Date(item.subscription.endsAt).toLocaleDateString() : "N/A");
                const isSuspended = item.status === "suspended";
                
                return (
                  <tr key={item.id} className="border-t border-[var(--border)] hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                    <td className="py-4">
                      <strong className="text-zinc-800 dark:text-zinc-200 block">{item.name}</strong>
                      <span className="text-xs text-zinc-400 block">{item.email}</span>
                      <div className="text-[11px] mt-1.5 text-zinc-500 flex flex-col gap-0.5">
                        <div>
                          <span className="font-medium text-zinc-650 dark:text-zinc-400">Current Plan:</span> {planName}
                        </div>
                        <div>
                          <span className="font-medium text-zinc-650 dark:text-zinc-400">Next Billing Date:</span> {nextBillingDate}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.role === "superadmin" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" :
                        item.role === "org_admin" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                        "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {item.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="text-sm font-medium">{planName}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {isSuperAdmin ? "Continuous Access" : (isPlanActive && item.subscription?.endsAt ? `${item.subscription.status === "active" ? "Next Renewal " : "Expires "}${new Date(item.subscription.endsAt).toLocaleDateString()}` : "N/A")}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        isSuspended ? "text-rose-600" : "text-emerald-600"
                      }`}>
                        {isSuspended ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {item.status || "active"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => handleSetUserStatus(item.id, item.status || "active")}
                        disabled={actionLoading === `user-status-${item.id}`}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          isSuspended 
                            ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-950/20 dark:hover:bg-emerald-950/10" 
                            : "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-950/20 dark:hover:bg-rose-950/10"
                        }`}
                      >
                        {isSuspended ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Reactivate
                          </>
                        ) : (
                          <>
                            <UserMinus className="w-3.5 h-3.5" />
                            Suspend
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
