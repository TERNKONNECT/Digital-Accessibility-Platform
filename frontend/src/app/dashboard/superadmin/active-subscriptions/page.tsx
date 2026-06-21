"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Layers, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AdminResponse, API_URL, authHeaders, formatDateOnly, formatMoney, Plan } from "@/lib/platform";

export default function ActiveSubscriptionsPage() {
  const { token } = useAuthStore();
  const [admin, setAdmin] = useState<AdminResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlanName, setSelectedPlanName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const [adminResponse, plansResponse] = await Promise.all([
        axios.get(`${API_URL}/platform/admin`, { headers: authHeaders(token) }),
        axios.get(`${API_URL}/platform/plans`, { headers: authHeaders(token) }),
      ]);
      setAdmin(adminResponse.data);
      setPlans(plansResponse.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load active subscriptions.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;

  if (error || !admin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-950/20 dark:bg-red-950/10">
        <h3 className="font-semibold text-lg">Error Loading Active Subscriptions</h3>
        <p className="mt-1 text-sm">{error || "Could not retrieve subscription information."}</p>
      </div>
    );
  }

  // Real customers only — excludes the platform's own superadmin accounts and users on deleted/inactive plans.
  const customers = admin.users.filter((u) => {
    if (u.role === "superadmin") return false;
    const planDetails = u.subscription?.planDetails;
    return planDetails && planDetails.status === "active";
  });

  const usersForPlan = (planName: string) =>
    customers.filter((u) => u.subscription?.status === "active" && u.subscription?.planDetails?.name === planName);

  const selectedUsers = selectedPlanName ? usersForPlan(selectedPlanName) : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Active Subscriptions</h1>
        <p className="text-zinc-500 mt-1.5">See how many customers are active on each subscription plan.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.filter((p) => p.status === "active").map((plan) => {
          const activeCount = usersForPlan(plan.name).length;
          const isSelected = selectedPlanName === plan.name;
          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanName(isSelected ? null : plan.name)}
              className={`rounded-2xl border bg-white p-6 text-left shadow-sm transition dark:bg-zinc-900 ${
                isSelected ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--primary)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{plan.name}</span>
                <Layers className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <p className="mt-4 text-3xl font-bold text-[var(--foreground)]">{activeCount}</p>
              <p className="mt-1 text-xs text-zinc-500">active subscription{activeCount === 1 ? "" : "s"}</p>
              <p className="mt-3 text-xs text-zinc-400">{formatMoney(plan.amount, plan.currency)} / {plan.billingCycle}</p>
            </button>
          );
        })}
      </div>

      {selectedPlanName && (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[var(--primary)]" />
            Users on {selectedPlanName}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400 border-b border-[var(--border)]">
                <tr>
                  <th className="pb-3 font-semibold">User details</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Renews</th>
                </tr>
              </thead>
              <tbody>
                {selectedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-zinc-500">
                      No active subscribers on this plan yet.
                    </td>
                  </tr>
                ) : (
                  selectedUsers.map((user) => (
                    <tr key={user.id} className="border-t border-[var(--border)]">
                      <td className="py-3">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">{user.name}</div>
                        <div className="text-xs text-zinc-400">{user.email}</div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                          {user.subscription?.status}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-500">{formatDateOnly(user.subscription?.endsAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
