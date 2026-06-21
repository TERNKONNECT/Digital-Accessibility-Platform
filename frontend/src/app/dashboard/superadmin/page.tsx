"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart3,
  DollarSign,
  Globe2,
  Monitor,
  Users,
  Wrench,
  TrendingUp,
  Layout
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AdminResponse, API_URL, authHeaders, formatMoney } from "@/lib/platform";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from "recharts";

export default function SuperAdminDashboard() {
  const { token } = useAuthStore();
  const [admin, setAdmin] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const response = await axios.get(`${API_URL}/platform/admin`, { headers: authHeaders(token) });
      setAdmin(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;

  if (!admin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-950/20 dark:bg-red-950/10">
        <h3 className="font-semibold text-lg">Error Loading Dashboard</h3>
        <p className="mt-1 text-sm">{error || "Could not retrieve superadmin overview metrics."}</p>
      </div>
    );
  }

  const metricCards = [
    { label: "Total Platform Users", value: admin.totals.totalUsers, icon: Users },
    { label: "Active Subscriptions", value: admin.totals.activeSubscriptions, icon: DollarSign },
    { label: "Chrome Profiles Linked", value: admin.totals.totalChromeProfiles, icon: Monitor },
    { label: "Websites Monitored", value: admin.totals.totalWebsites, icon: Globe2 },
    { label: "Widget Loads (Total)", value: admin.analytics.widgetUsage || 0, icon: BarChart3 },
    { label: "Extension Connections", value: admin.analytics.activeIntegrations || 0, icon: Wrench },
  ];

  // Prepare chart data
  const chartData = [
    { name: "Users", value: admin.totals.totalUsers, color: "#4F46E5" },
    { name: "Active Subscriptions", value: admin.totals.activeSubscriptions, color: "#10B981" },
    { name: "Chrome Profiles", value: admin.totals.totalChromeProfiles, color: "#3B82F6" },
    { name: "Websites Monitored", value: admin.totals.totalWebsites, color: "#F59E0B" },
    { name: "Active Integrations", value: admin.analytics.activeIntegrations || 0, color: "#8B5CF6" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Super Admin Overview</h1>
        <p className="text-zinc-500 mt-1.5">Overview of system health, active users, license limits, and usage analytics.</p>
      </div>

      {/* Metrics Banner */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metricCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm hover:shadow transition-shadow dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
              <Icon className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <p className="mt-4 text-3xl font-bold text-[var(--foreground)]">
              {label.includes("Revenue") ? formatMoney(Number(value)) : value}
            </p>
          </div>
        ))}
      </div>

      {/* Analytics Chart Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
              Platform Scaling Metrics
            </h2>
            <p className="text-xs text-zinc-400 mb-6">Visual comparison of account volumes and active installations.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="#9CA3AF" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#9CA3AF" />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2 mb-1">
              <Layout className="w-5 h-5 text-[var(--primary)]" />
              System Status Summary
            </h2>
            <p className="text-xs text-zinc-400 mb-6">General status and counts on monitoring widgets.</p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-sm text-zinc-500">Active Website Widgets</span>
              <strong className="text-lg text-[var(--foreground)]">{admin.analytics.activeWebsites || 0}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-sm text-zinc-500">Active Chrome Integrations</span>
              <strong className="text-lg text-[var(--foreground)]">{admin.analytics.activeIntegrations || 0}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-sm text-zinc-500">Monthly Active Users</span>
              <strong className="text-lg text-[var(--foreground)]">{admin.analytics.monthlyActiveUsers || 0}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-sm text-zinc-500">Daily Active Users</span>
              <strong className="text-lg text-[var(--foreground)]">{admin.analytics.dailyActiveUsers || 0}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Total Subscription Revenue</span>
              <strong className="text-lg text-emerald-600">{formatMoney(admin.totals.revenue)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
