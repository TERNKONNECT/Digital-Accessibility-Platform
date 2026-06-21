"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Globe2, Plus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { apiErrorMessage, createWidget, fetchOverview, OverviewResponse, WidgetSite } from "@/lib/platform";

export default function WidgetToolPage() {
  const { token } = useAuthStore();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [websiteName, setWebsiteName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!token) return;
    fetchOverview(token).then(setOverview).catch(console.error);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateWidget(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createWidget(token, websiteName, websiteUrl);
      setWebsiteName("");
      setWebsiteUrl("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not add this website."));
      load(); // refresh overLimit in case the limit was just reached
    }
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  }

  if (!overview) return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;

  const widget = overview.tools.widget;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/tools" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-500 hover:text-[var(--foreground)]">
        <ArrowLeft className="h-4 w-4" /> Back to Tools
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Globe2 className="h-6 w-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold">Website Widget</h1>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            <strong className="text-zinc-900 dark:text-zinc-100">{widget.websites.length}</strong> of {widget.websiteLimit ?? "Unlimited"} websites used
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${widget.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>{widget.status}</span>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

      {widget.overLimit ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          You&apos;ve reached your plan&apos;s website limit. <Link href="/dashboard/billing" className="font-semibold underline">Upgrade your plan</Link> to add more.
        </p>
      ) : showForm ? (
        <form onSubmit={handleCreateWidget} className="grid max-w-sm gap-3 rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
          <label className="text-sm font-medium">Website Name</label>
          <input value={websiteName} onChange={(event) => setWebsiteName(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" required />
          <label className="text-sm font-medium">Website URL</label>
          <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" placeholder="https://example.com" required />
          <div className="flex gap-2">
            <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">Generate Widget</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium">Cancel</button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Add Website
        </button>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Connected websites</h2>
        {widget.websites.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-zinc-500">No websites connected yet.</p>
            <p className="text-xs text-zinc-400">Add a website to generate its embed script.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
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
                  <button onClick={() => copy(site.embedScript, site.id)} className="inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                    {copied === site.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === site.id ? "Copied" : "Copy Embed Script"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
