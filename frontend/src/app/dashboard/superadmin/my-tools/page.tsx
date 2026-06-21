"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe2, Monitor, Wrench } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { fetchOverview, OverviewResponse } from "@/lib/platform";

export default function MyInternalToolsPage() {
  const { token } = useAuthStore();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    fetchOverview(token).then(setOverview).catch(console.error);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!overview) return <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;

  const chrome = overview.tools.chromeExtension;
  const widget = overview.tools.widget;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--foreground)] tracking-tight">
          <Wrench className="w-7 h-7 text-[var(--primary)]" />
          My Internal Tools
        </h1>
        <p className="text-zinc-500 mt-1.5">
          Your own Chrome Extension and Website Widget for internal use — free and unlimited as superadmin, and excluded from revenue and the Tool Management view.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/dashboard/tools/chrome-extension"
          className="group rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition hover:border-[var(--primary)] dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-6 w-6 text-[var(--primary)]" />
              <h2 className="text-xl font-semibold">Chrome Extension</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chrome.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
              {chrome.status}
            </span>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            <strong className="text-zinc-900 dark:text-zinc-100">{chrome.connectedProfiles.length}</strong> device(s) connected
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] group-hover:gap-3">
            Manage <ArrowRight className="h-4 w-4 transition-all" />
          </span>
        </Link>

        <Link
          href="/dashboard/tools/widget"
          className="group rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition hover:border-[var(--accent)] dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Globe2 className="h-6 w-6 text-[var(--accent)]" />
              <h2 className="text-xl font-semibold">Website Widget</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${widget.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
              {widget.status}
            </span>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            <strong className="text-zinc-900 dark:text-zinc-100">{widget.websites.length}</strong> website(s) connected
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] group-hover:gap-3">
            Manage <ArrowRight className="h-4 w-4 transition-all" />
          </span>
        </Link>
      </div>
    </div>
  );
}
