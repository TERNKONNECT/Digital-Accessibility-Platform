"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BarChart3, DollarSign, Globe2, Monitor, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AdminResponse, AdminUser, API_URL, authHeaders, formatMoney, Plan } from "@/lib/platform";

export default function AdminPage() {
  const { token, user } = useAuthStore();
  const [admin, setAdmin] = useState<AdminResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [query, setQuery] = useState("");
  const [planForm, setPlanForm] = useState({ name: "", amount: "9900", maxChromeProfiles: "10", maxWebsites: "5" });

  const load = useCallback(async () => {
    if (!token) return;
    const [adminResponse, plansResponse] = await Promise.all([
      axios.get(`${API_URL}/platform/admin`, { headers: authHeaders(token) }),
      axios.get(`${API_URL}/platform/plans`, { headers: authHeaders(token) }),
    ]);
    setAdmin(adminResponse.data);
    setPlans(plansResponse.data);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      axios.get(`${API_URL}/platform/admin`, { headers: authHeaders(token) }),
      axios.get(`${API_URL}/platform/plans`, { headers: authHeaders(token) }),
    ])
      .then(([adminResponse, plansResponse]) => {
        setAdmin(adminResponse.data);
        setPlans(plansResponse.data);
      })
      .catch(console.error);
  }, [token]);

  const filteredUsers = useMemo(() => {
    if (!admin) return [];
    const needle = query.toLowerCase();
    return admin.users.filter((item: AdminUser) => item.name.toLowerCase().includes(needle) || item.email.toLowerCase().includes(needle));
  }, [admin, query]);

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    await axios.post(`${API_URL}/platform/admin/plans`, {
      name: planForm.name,
      amount: Number(planForm.amount),
      maxChromeProfiles: Number(planForm.maxChromeProfiles),
      maxWebsites: Number(planForm.maxWebsites),
      chromeExtensionAccess: true,
      widgetAccess: true,
      billingCycle: "monthly",
      status: "active",
    }, { headers: authHeaders(token) });
    setPlanForm({ name: "", amount: "9900", maxChromeProfiles: "10", maxWebsites: "5" });
    load();
  }

  async function togglePlan(plan: Plan) {
    await axios.patch(`${API_URL}/platform/admin/plans/${plan.id}`, { status: plan.status === "active" ? "inactive" : "active" }, { headers: authHeaders(token) });
    load();
  }

  async function setUserStatus(id: string, status: "active" | "suspended") {
    await axios.patch(`${API_URL}/platform/admin/users/${id}/status`, { status }, { headers: authHeaders(token) });
    load();
  }

  if (!admin) return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;

  const metricCards = [
    { label: "Total Users", value: admin.totals.totalUsers, icon: Users },
    { label: "Active Users", value: admin.totals.activeUsers, icon: BarChart3 },
    { label: "Active Subscriptions", value: admin.totals.activeSubscriptions, icon: DollarSign },
    { label: "Revenue", value: formatMoney(admin.totals.revenue), icon: DollarSign },
    { label: "Chrome Profiles", value: admin.totals.totalChromeProfiles, icon: Monitor },
    { label: "Websites", value: admin.totals.totalWebsites, icon: Globe2 },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-zinc-500">Manage subscriptions, users, integrations, widgets, and platform analytics.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {metricCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-[var(--border)] bg-white p-5 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500">{label}</p>
              <Icon className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold">Platform Analytics</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <p className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">Daily Active Users <strong className="block text-2xl">{admin.analytics.dailyActiveUsers}</strong></p>
          <p className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">Monthly Active Users <strong className="block text-2xl">{admin.analytics.monthlyActiveUsers}</strong></p>
          <p className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">New Subscriptions <strong className="block text-2xl">{admin.analytics.newSubscriptions}</strong></p>
          <p className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">Active Integrations <strong className="block text-2xl">{admin.analytics.activeIntegrations}</strong></p>
          <p className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">Active Websites <strong className="block text-2xl">{admin.analytics.activeWebsites}</strong></p>
          <p className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">Widget Usage <strong className="block text-2xl">{admin.analytics.widgetUsage || 0}</strong></p>
        </div>
      </section>

      {user?.role === "superadmin" && (
        <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Subscription Management</h2>
            <form onSubmit={createPlan} className="flex flex-wrap gap-2">
              <input value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" placeholder="Plan name" required />
              <input value={planForm.amount} onChange={(event) => setPlanForm({ ...planForm, amount: event.target.value })} className="w-28 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" placeholder="Amount" required />
              <input value={planForm.maxChromeProfiles} onChange={(event) => setPlanForm({ ...planForm, maxChromeProfiles: event.target.value })} className="w-24 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" placeholder="Profiles" required />
              <input value={planForm.maxWebsites} onChange={(event) => setPlanForm({ ...planForm, maxWebsites: event.target.value })} className="w-24 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" placeholder="Sites" required />
              <button className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white">Create Plan</button>
            </form>
          </div>
          <div className="mt-5 grid gap-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                <p><strong>{plan.name}</strong> · {formatMoney(plan.amount, plan.currency)} · {plan.maxChromeProfiles ?? "Unlimited"} profiles · {plan.maxWebsites ?? "Unlimited"} websites</p>
                <button onClick={() => togglePlan(plan)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">{plan.status === "active" ? "Disable" : "Enable"}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">User Management and Tool Usage</h2>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" placeholder="Search users" />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500"><tr><th className="py-2">User</th><th>Plan</th><th>Chrome</th><th>Profiles</th><th>Websites</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filteredUsers.map((item: AdminUser) => {
                const planDetails = item.subscription?.planDetails;
                const isPlanActive = planDetails && planDetails.status === "active";
                const isSuperAdmin = item.role === "superadmin";
                const planName = isSuperAdmin ? "Super Admin (Unlimited)" : (isPlanActive ? planDetails.name : "None");
                const nextBillingDate = isSuperAdmin ? "Continuous Access" : (isPlanActive && item.subscription?.endsAt ? new Date(item.subscription.endsAt).toLocaleDateString() : "N/A");
                return (
                  <tr key={item.id} className="border-t border-[var(--border)]">
                    <td className="py-3">
                      <strong>{item.name}</strong>
                      <p className="text-xs text-zinc-500">{item.email}</p>
                      <div className="text-[11px] mt-1.5 text-zinc-500 flex flex-col gap-0.5">
                        <div>
                          <span className="font-medium text-zinc-650 dark:text-zinc-400">Current Plan:</span> {planName}
                        </div>
                        <div>
                          <span className="font-medium text-zinc-650 dark:text-zinc-400">Next Billing Date:</span> {nextBillingDate}
                        </div>
                      </div>
                    </td>
                    <td>{planName}</td>
                    <td>{item.chromeIntegration?.integrationCode || "No integration"}</td>
                    <td>{item.chromeIntegration?.profiles?.length || 0}</td>
                    <td>{item.widgetSites?.length || 0}</td>
                    <td>{item.status || "active"}</td>
                    <td><button onClick={() => setUserStatus(item.id, item.status === "suspended" ? "active" : "suspended")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">{item.status === "suspended" ? "Reactivate" : "Suspend"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
