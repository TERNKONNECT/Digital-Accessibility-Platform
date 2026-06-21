"use client";

import { useEffect, useState } from "react";
import { Activity, CalendarClock, Globe2, Layers, Monitor, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ActivityEntry, fetchOverview, formatDate, formatDateOnly, formatMoney, OverviewResponse } from "@/lib/platform";

export default function OverviewDashboard({ title, subtitle }: { title: string; subtitle: string }) {
  const { token } = useAuthStore();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);

  useEffect(() => {
    if (token) fetchOverview(token).then(setOverview).catch(console.error);
  }, [token]);

  if (!overview) {
    return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
  }

  const cards = [
    { label: "Active Subscription", value: overview.subscription.planName, icon: Layers, note: `${formatMoney(overview.subscription.price, overview.subscription.currency)} / ${overview.subscription.billingCycle}` },
    { label: "Next Renewal Date", value: formatDateOnly(overview.subscription.renewalDate), icon: CalendarClock, note: overview.subscription.status },
    { label: "Tools Enabled", value: overview.totals.toolsEnabled, icon: Activity, note: "Chrome Extension and Widget" },
    { label: "Widget Websites", value: overview.totals.widgetWebsites, icon: Globe2, note: `${overview.subscription.maxWebsites ?? "Unlimited"} allowed` },
    { label: "Chrome Profiles", value: overview.totals.chromeProfiles, icon: Monitor, note: `${overview.subscription.maxChromeProfiles ?? "Unlimited"} allowed` },
    { label: "Active Profiles", value: overview.totals.activeChromeProfiles, icon: Users, note: "Last 30 days tracked" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{title}</h1>
        <p className="text-zinc-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">{card.label}</p>
                <Icon className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{card.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{card.note}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Tool Status</h2>
          <div className="mt-5 grid gap-4">
            {[
              ["Chrome Extension", overview.tools.chromeExtension.status, `${overview.totals.chromeProfiles} connected profiles`, overview.tools.chromeExtension.lastActivity],
              ["Website Widget", overview.tools.widget.status, `${overview.totals.widgetWebsites} websites connected`, overview.tools.widget.lastActivity],
            ].map(([name, status, count, lastActivity]) => (
              <div key={name as string} className="flex items-center justify-between rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-zinc-500">{count}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>{status}</span>
                  <p className="mt-2 text-xs text-zinc-500">{formatDate(lastActivity as string | null)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <div className="mt-5 grid gap-3">
            {overview.recentActivity.length === 0 ? (
              <p className="text-sm text-zinc-500">No activity recorded yet.</p>
            ) : (
              overview.recentActivity.slice(0, 6).map((item: ActivityEntry) => (
                <div key={item.id} className="border-b border-[var(--border)] pb-3 last:border-0">
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-zinc-500">{formatDate(item.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
