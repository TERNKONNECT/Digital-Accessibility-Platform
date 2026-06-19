"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Check, Copy, Globe2, Monitor, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { API_URL, authHeaders, ChromeProfile, fetchOverview, formatDate, OverviewResponse, WidgetSite } from "@/lib/platform";

export default function ToolsPage() {
  const { token } = useAuthStore();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [integrationName, setIntegrationName] = useState("Chrome Extension Integration");
  const [websiteName, setWebsiteName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(() => {
    if (!token) return;
    fetchOverview(token).then(setOverview).catch(console.error);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function createChromeIntegration(event: React.FormEvent) {
    event.preventDefault();
    await axios.post(`${API_URL}/platform/chrome-integration`, { name: integrationName }, { headers: authHeaders(token) });
    load();
  }

  async function regenerateChromeCode() {
    await axios.post(`${API_URL}/platform/chrome-integration/regenerate`, {}, { headers: authHeaders(token) });
    load();
  }

  async function createWidget(event: React.FormEvent) {
    event.preventDefault();
    await axios.post(`${API_URL}/platform/widgets`, { websiteName, websiteUrl }, { headers: authHeaders(token) });
    setWebsiteName("");
    setWebsiteUrl("");
    load();
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  }

  if (!overview) return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;

  const chrome = overview.tools.chromeExtension;
  const widget = overview.tools.widget;
  const chromeIntegration = chrome.integration;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Tools</h1>
        <p className="text-zinc-500">Manage Chrome Extension and Website Widget access.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Monitor className="h-6 w-6 text-[var(--primary)]" />
                <h2 className="text-xl font-semibold">Chrome Extension</h2>
              </div>
              <p className="mt-2 text-sm text-zinc-500">One integration code connects managed Chrome profiles.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chrome.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>{chrome.status}</span>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <p>Subscription Access: <strong>{overview.subscription.chromeExtensionAccess ? "Yes" : "No"}</strong></p>
            <p>Total Connected Profiles: <strong>{chrome.connectedProfiles.length}</strong></p>
            <p>Last Activity: <strong>{formatDate(chrome.lastActivity)}</strong></p>
            {chrome.overLimit && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Profile limit reached. Usage is tracked so you can upgrade before enforcement.</p>}
          </div>

          {!chromeIntegration ? (
            <form onSubmit={createChromeIntegration} className="mt-6 grid gap-3">
              <label className="text-sm font-medium">Integration Name</label>
              <input value={integrationName} onChange={(event) => setIntegrationName(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" required />
              <button className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white">Generate Integration</button>
            </form>
          ) : (
            <div className="mt-6 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
              <p className="text-sm text-zinc-500">Integration Details</p>
              <h3 className="mt-1 font-semibold">{chromeIntegration.name}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="rounded bg-white px-3 py-2 text-sm dark:bg-zinc-900">{chromeIntegration.integrationCode}</code>
                <button onClick={() => copy(chromeIntegration.integrationCode, "chrome")} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"><Copy className="h-4 w-4" />{copied === "chrome" ? "Copied" : "Copy"}</button>
                <button onClick={regenerateChromeCode} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" />Regenerate</button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">Created {formatDate(chromeIntegration.createdAt)} · {chromeIntegration.status}</p>
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500"><tr><th className="py-2">Profile</th><th>Profile ID</th><th>First Seen</th><th>Last Active</th><th>Status</th></tr></thead>
              <tbody>
                {chrome.connectedProfiles.map((profile: ChromeProfile) => (
                  <tr key={profile.id} className="border-t border-[var(--border)]"><td className="py-3">{profile.profileName}</td><td>{profile.profileId}</td><td>{formatDate(profile.firstSeenAt)}</td><td>{formatDate(profile.lastActiveAt)}</td><td>{profile.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Globe2 className="h-6 w-6 text-[var(--accent)]" />
                <h2 className="text-xl font-semibold">Website Widget</h2>
              </div>
              <p className="mt-2 text-sm text-zinc-500">Generate embed scripts and track widget usage by website.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${widget.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>{widget.status}</span>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <p>Websites Connected: <strong>{widget.websites.length}</strong></p>
            <p>Subscription Limit: <strong>{widget.websiteLimit ?? "Unlimited"}</strong></p>
            <p>Last Activity: <strong>{formatDate(widget.lastActivity)}</strong></p>
            {widget.overLimit && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Website limit reached. Usage is tracked so you can upgrade before enforcement.</p>}
          </div>

          <form onSubmit={createWidget} className="mt-6 grid gap-3">
            <label className="text-sm font-medium">Website Name</label>
            <input value={websiteName} onChange={(event) => setWebsiteName(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" required />
            <label className="text-sm font-medium">Website URL</label>
            <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" placeholder="https://example.com" required />
            <button className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white">Generate Widget</button>
          </form>

          <div className="mt-6 grid gap-4">
            {widget.websites.map((site: WidgetSite) => (
              <div key={site.id} className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{site.websiteName}</p>
                    <p className="text-sm text-zinc-500">{site.websiteUrl}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold dark:bg-zinc-900">{site.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <p>Widget ID: <code>{site.widgetId}</code></p>
                  <p>Usage: <strong>{site.usageCount}</strong> · Loads: <strong>{site.widgetLoads}</strong> · Daily: <strong>{site.dailyUsage}</strong> · Weekly: <strong>{site.weeklyUsage}</strong> · Monthly: <strong>{site.monthlyUsage}</strong></p>
                  <button onClick={() => copy(site.embedScript, site.id)} className="inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">{copied === site.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === site.id ? "Copied" : "Copy Embed Script"}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
