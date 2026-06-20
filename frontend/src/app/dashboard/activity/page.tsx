"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { ActivityEntry, fetchOverview, formatDate, OverviewResponse } from "@/lib/platform";

export default function ActivityPage() {
  const { token } = useAuthStore();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);

  useEffect(() => {
    if (token) fetchOverview(token).then(setOverview).catch(console.error);
  }, [token]);

  if (!overview) return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="text-zinc-500">Login, tool creation, widget activation, extension activation, and subscription events.</p>
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        <div className="grid gap-4">
          {overview.recentActivity.length === 0 ? (
            <p className="text-zinc-500">No activity has been recorded yet.</p>
          ) : (
            overview.recentActivity.map((activity: ActivityEntry) => (
              <div key={activity.id} className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{activity.description}</p>
                    <p className="text-sm text-zinc-500">{activity.actionType}</p>
                  </div>
                  <p className="text-sm text-zinc-500">{formatDate(activity.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
