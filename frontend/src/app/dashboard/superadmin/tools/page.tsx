"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart3,
  Globe2,
  Monitor,
  Wrench,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AdminResponse, API_URL, authHeaders } from "@/lib/platform";

export default function ToolManagementPage() {
  const { token } = useAuthStore();
  const [admin, setAdmin] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Active states
  const [expandedIntegrationUserId, setExpandedIntegrationUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Profile Activities state
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileActivities, setProfileActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  async function toggleProfileActivities(profileId: string) {
    if (selectedProfileId === profileId) {
      setSelectedProfileId(null);
      setProfileActivities([]);
      return;
    }
    setSelectedProfileId(profileId);
    setLoadingActivities(true);
    try {
      const res = await axios.get(`${API_URL}/platform/chrome/profiles/${profileId}/activities`, { headers: authHeaders(token) });
      setProfileActivities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivities(false);
    }
  }

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const response = await axios.get(`${API_URL}/platform/admin`, { headers: authHeaders(token) });
      setAdmin(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load tools data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset / Clear / Regenerate chrome integration routines
  async function handleResetUserIntegration(userId: string) {
    if (!token) return;
    if (!confirm("Are you sure you want to reset this user's Chrome Extension Integration? This will clear all connected profiles, log out their extension, and generate a new code.")) {
      return;
    }
    setActionLoading(`integration-reset-${userId}`);
    try {
      await axios.post(
        `${API_URL}/platform/admin/users/${userId}/chrome-integration`,
        {},
        { headers: authHeaders(token) }
      );
      alert("Chrome integration reset successfully! Fresh inactive code generated.");
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to reset integration.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRegenerateUserCode(userId: string) {
    if (!token) return;
    if (!confirm("Regenerate extension integration code? Old code will be invalidated, and active profiles will be logged out.")) {
      return;
    }
    setActionLoading(`integration-regen-${userId}`);
    try {
      await axios.post(
        `${API_URL}/platform/admin/users/${userId}/chrome-integration/regenerate`,
        {},
        { headers: authHeaders(token) }
      );
      alert("New integration code generated successfully.");
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to regenerate code.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;

  if (error || !admin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-950/20 dark:bg-red-950/10">
        <h3 className="font-semibold text-lg">Error Loading Tool Integration</h3>
        <p className="mt-1 text-sm">{error || "Could not retrieve tools information."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Tool Management</h1>
        <p className="text-zinc-500 mt-1.5">Track accessibility widgets, Chrome profiles, usage counters, and API connections.</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Overview metrics */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-[var(--primary)]" />
            Accessibility Integrations Overview
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
              <span className="text-xs text-zinc-400 uppercase tracking-wider block font-semibold">Active Extensions</span>
              <strong className="text-2xl mt-1 block text-[var(--foreground)]">{admin.analytics.activeIntegrations || 0}</strong>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
              <span className="text-xs text-zinc-400 uppercase tracking-wider block font-semibold">Chrome Profiles Running</span>
              <strong className="text-2xl mt-1 block text-[var(--foreground)]">{admin.totals.totalChromeProfiles || 0}</strong>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
              <span className="text-xs text-zinc-400 uppercase tracking-wider block font-semibold">Active Website Widgets</span>
              <strong className="text-2xl mt-1 block text-[var(--foreground)]">{admin.analytics.activeWebsites || 0}</strong>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
              <span className="text-xs text-zinc-400 uppercase tracking-wider block font-semibold">Aggregated Widget Usage</span>
              <strong className="text-2xl mt-1 block text-[var(--foreground)]">{admin.analytics.widgetUsage || 0}</strong>
            </div>
          </div>
        </div>

        {/* Chrome Extension Table */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Monitor className="w-5 h-5 text-[var(--primary)]" />
            Chrome Extension Integrations & Profiles
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400 border-b border-[var(--border)]">
                <tr>
                  <th className="pb-3 font-semibold">User Details</th>
                  <th className="pb-3 font-semibold">Integration Code</th>
                  <th className="pb-3 font-semibold">Device Slots (Used)</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admin.users.map((item) => {
                  const integration = item.chromeIntegration;
                  const hasIntegration = !!integration;
                  const isExpanded = expandedIntegrationUserId === item.id;
                  
                  return (
                    <Fragment key={item.id}>
                      <tr className="border-t border-[var(--border)] hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                        <td className="py-4">
                          <strong className="text-zinc-800 dark:text-zinc-200 block">{item.name}</strong>
                          <span className="text-xs text-zinc-400">{item.email}</span>
                        </td>
                        <td className="py-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {hasIntegration ? integration.integrationCode : <span className="text-zinc-400">No integration</span>}
                        </td>
                        <td className="py-4">
                          {hasIntegration ? (
                            <button 
                              onClick={() => setExpandedIntegrationUserId(isExpanded ? null : item.id)}
                              className="inline-flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded text-xs font-semibold hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                            >
                              {integration.profiles?.length || 0} slots
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            "0 slots"
                          )}
                        </td>
                        <td className="py-4">
                          {hasIntegration ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              integration.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}>
                              {integration.status}
                            </span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="py-4 text-right flex justify-end gap-2">
                          {!hasIntegration ? (
                            <button
                              onClick={() => handleResetUserIntegration(item.id)}
                              disabled={actionLoading === `integration-reset-${item.id}`}
                              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            >
                              Generate Code
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRegenerateUserCode(item.id)}
                                disabled={actionLoading === `integration-regen-${item.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 text-xs font-medium dark:border-amber-950/20 dark:hover:bg-amber-950/10 transition-colors disabled:opacity-50"
                                title="Regenerate Integration Code"
                              >
                                <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                                Reset Code
                              </button>
                              <button
                                onClick={() => handleResetUserIntegration(item.id)}
                                disabled={actionLoading === `integration-reset-${item.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1.5 text-xs font-medium dark:border-red-950/20 dark:hover:bg-red-950/10 transition-colors disabled:opacity-50"
                                title="Reset Extension profiles"
                              >
                                Clear Profiles
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      
                      {isExpanded && hasIntegration && (
                        <tr className="bg-zinc-50/50 dark:bg-zinc-950/20">
                          <td colSpan={5} className="border-t border-[var(--border)] px-6 py-4">
                            <h4 className="text-xs font-bold uppercase text-zinc-500 mb-2">Connected Chrome Profile Devices</h4>
                            {(!integration.profiles || integration.profiles.length === 0) ? (
                              <p className="text-xs text-zinc-400">No devices/profiles linked to this extension integration yet.</p>
                            ) : (
                              <div className="flex flex-col gap-3">
                                {integration.profiles.map((profile: any) => {
                                  const isProfileActiveExpanded = selectedProfileId === profile.id;
                                  return (
                                    <div key={profile.id} className="border border-[var(--border)] rounded-xl bg-white dark:bg-zinc-950/40 overflow-hidden">
                                      <div className="grid grid-cols-1 md:grid-cols-5 items-center text-xs text-zinc-650 dark:text-zinc-450 p-4 gap-4">
                                        <div className="md:col-span-2">
                                          <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{profile.profileName}</div>
                                          {profile.chromeEmail && <div className="text-xs text-zinc-400 mt-0.5">{profile.chromeEmail}</div>}
                                        </div>
                                        <div className="font-mono text-[10px] truncate text-zinc-500" title={profile.profileId}>{profile.profileId}</div>
                                        <div className="text-zinc-500">{profile.browserVersion || "Chrome"}</div>
                                        <div className="text-right flex items-center justify-end gap-3">
                                          <span className="text-[10px] text-zinc-400">{new Date(profile.lastActiveAt).toLocaleString()}</span>
                                          <button
                                            onClick={() => toggleProfileActivities(profile.id)}
                                            className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                                          >
                                            {isProfileActiveExpanded ? "Hide Activity" : "View Activity"}
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {isProfileActiveExpanded && (
                                        <div className="border-t border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-950/40 p-4 flex flex-col gap-3">
                                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Profile Activity Log</div>
                                          {loadingActivities ? (
                                            <div className="animate-pulse text-xs text-zinc-400 py-1">Loading activities...</div>
                                          ) : profileActivities.length === 0 ? (
                                            <div className="text-xs text-zinc-400 py-1">No activities tracked yet.</div>
                                          ) : (
                                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                                              {profileActivities.map((act: any) => (
                                                <div key={act.id} className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0 gap-4">
                                                  <div className="flex flex-col gap-0.5">
                                                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{act.actionType}</div>
                                                    <div className="text-xs text-zinc-500">{act.description}</div>
                                                    {act.metadata && Object.keys(act.metadata).length > 0 && (
                                                      <pre className="mt-1 max-w-xl overflow-x-auto rounded bg-zinc-100 p-2 text-[10px] text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400">
                                                        {JSON.stringify(act.metadata, null, 2)}
                                                      </pre>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-zinc-400 whitespace-nowrap">{new Date(act.createdAt).toLocaleString()}</div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Website Widgets Table */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Globe2 className="w-5 h-5 text-[var(--primary)]" />
            Website Widgets Monitored
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400 border-b border-[var(--border)]">
                <tr>
                  <th className="pb-3 font-semibold">Website</th>
                  <th className="pb-3 font-semibold">URL</th>
                  <th className="pb-3 font-semibold">Owner</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Aggregated Loads</th>
                </tr>
              </thead>
              <tbody>
                {admin.users.flatMap(u => (u.widgetSites || []).map(site => ({ ...site, owner: u }))).map((site: any) => (
                  <tr key={site.id} className="border-t border-[var(--border)] hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                    <td className="py-4 font-semibold text-zinc-800 dark:text-zinc-200">{site.websiteName}</td>
                    <td className="py-4 font-mono text-xs text-zinc-500">
                      <a href={site.websiteUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--primary)]">{site.websiteUrl}</a>
                    </td>
                    <td className="py-4 text-xs text-zinc-500">
                      <div>{site.owner.name}</div>
                      <div>{site.owner.email}</div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        site.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="py-4 text-right font-bold text-zinc-800 dark:text-zinc-200">
                      {site.usageCount || 0} loads
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
