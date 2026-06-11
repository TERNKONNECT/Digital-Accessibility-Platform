"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const API_URL = "http://localhost:9001/api";

export default function OrgAdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (token) {
      axios.get(`${API_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setStats(res.data)).catch(console.error);
    }
  }, [token]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Organization Dashboard</h1>
        <p className="text-zinc-500">Overview of your organization's usage</p>
      </div>

      {!stats ? (
        <div className="animate-pulse h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 uppercase">Organization Users</h3>
            <p className="text-4xl font-bold text-[var(--primary)] mt-2">{stats.stats?.totalUsers || 0}</p>
          </div>
          <div className="p-6 bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 uppercase">Total Org Usage</h3>
            <p className="text-4xl font-bold text-[var(--accent)] mt-2">{stats.stats?.totalUsageLogs || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
