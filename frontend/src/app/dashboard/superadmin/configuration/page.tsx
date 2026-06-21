"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Settings, Save, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { API_URL, authHeaders } from "@/lib/platform";

interface SystemSettings {
  adminMaxChromeProfiles: number | null;
  adminMaxWebsites: number | null;
  defaultTrialDurationMinutes: number;
  defaultTrialSessions: number;
}

export default function ConfigurationPage() {
  const { token } = useAuthStore();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // UI form variables
  const [formData, setFormData] = useState({
    adminMaxChromeProfiles: "",
    adminMaxWebsites: "",
    defaultTrialDurationMinutes: "5",
    defaultTrialSessions: "3",
  });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const response = await axios.get(`${API_URL}/platform/admin/settings`, { headers: authHeaders(token) });
      const data = response.data;
      setSettings(data);
      setFormData({
        adminMaxChromeProfiles: data.adminMaxChromeProfiles !== null ? String(data.adminMaxChromeProfiles) : "",
        adminMaxWebsites: data.adminMaxWebsites !== null ? String(data.adminMaxWebsites) : "",
        defaultTrialDurationMinutes: String(data.defaultTrialDurationMinutes),
        defaultTrialSessions: String(data.defaultTrialSessions),
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load system settings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setActionLoading(true);
    setSuccessMsg("");
    try {
      const response = await axios.post(`${API_URL}/platform/admin/settings`, {
        adminMaxChromeProfiles: formData.adminMaxChromeProfiles === "" ? "" : Number(formData.adminMaxChromeProfiles),
        adminMaxWebsites: formData.adminMaxWebsites === "" ? "" : Number(formData.adminMaxWebsites),
        defaultTrialDurationMinutes: Number(formData.defaultTrialDurationMinutes),
        defaultTrialSessions: Number(formData.defaultTrialSessions),
      }, { headers: authHeaders(token) });
      
      setSuccessMsg(response.data.message || "Settings updated successfully.");
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to save settings.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;

  if (error || !settings) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-950/20 dark:bg-red-950/10">
        <h3 className="font-semibold text-lg">Error Loading Settings</h3>
        <p className="mt-1 text-sm">{error || "Could not retrieve settings."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">System Configuration</h1>
        <p className="text-zinc-500 mt-1.5">Manage system-wide defaults, trial limits, and configure admin profile allocations.</p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm flex flex-col gap-6">
        <h3 className="text-lg font-bold flex items-center gap-2 border-b border-[var(--border)] pb-4">
          <Settings className="w-5 h-5 text-[var(--primary)]" />
          Settings Panel
        </h3>

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm dark:bg-emerald-950/20 dark:border-emerald-950/10">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Admin Limits Section */}
            <div className="flex flex-col gap-4 border border-[var(--border)] p-5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
              <h4 className="font-semibold text-sm text-[var(--foreground)] uppercase tracking-wider text-zinc-400">Admin Account Quotas</h4>
              
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-semibold text-zinc-500">Admin Max Chrome Profiles</label>
                <input
                  type="number"
                  value={formData.adminMaxChromeProfiles}
                  onChange={(e) => setFormData({ ...formData, adminMaxChromeProfiles: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Leave empty for unlimited"
                />
                <span className="text-[10px] text-zinc-400">The total Chrome device slots allowed for super admin profiles.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Admin Max Website Widgets</label>
                <input
                  type="number"
                  value={formData.adminMaxWebsites}
                  onChange={(e) => setFormData({ ...formData, adminMaxWebsites: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Leave empty for unlimited"
                />
                <span className="text-[10px] text-zinc-400">The total website tunnels/widgets allowed for super admin.</span>
              </div>
            </div>

            {/* Trial Parameters Section */}
            <div className="flex flex-col gap-4 border border-[var(--border)] p-5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
              <h4 className="font-semibold text-sm text-[var(--foreground)] uppercase tracking-wider text-zinc-400">Extension Trial Defaults</h4>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-semibold text-zinc-500">Trial Session Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  value={formData.defaultTrialDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, defaultTrialDurationMinutes: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <span className="text-[10px] text-zinc-400">Duration of each individual Chrome extension trial connection.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Max Free Trial Sessions</label>
                <input
                  type="number"
                  required
                  value={formData.defaultTrialSessions}
                  onChange={(e) => setFormData({ ...formData, defaultTrialSessions: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <span className="text-[10px] text-zinc-400">The total number of trial sessions allowed before prompting sign-up.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-950/10 p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Leaving Chrome profile or Website limits empty will grant the admin account **Unlimited** access capacity.</span>
          </div>

          <div className="flex justify-end border-t border-[var(--border)] pt-4">
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 font-medium text-white shadow hover:bg-[var(--accent)] transition-colors text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {actionLoading ? "Saving..." : "Save System Config"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
