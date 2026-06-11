"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

export default function ToolsDashboard() {
  const { token } = useAuthStore();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get("http://localhost:9001/api/tools", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setTools(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [token]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Accessibility Tools</h1>
        <p className="text-zinc-500">Explore and integrate Ternkonnect tools</p>
      </div>

      {loading ? (
        <div className="animate-pulse h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => (
            <Link key={tool.id} href={`/dashboard/tools/${tool.id}`} className="block group">
              <div className="p-6 h-full bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-sm group-hover:border-[var(--primary)] transition-colors">
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{tool.name}</h3>
                <p className="text-sm font-medium text-zinc-500 uppercase mb-4">{tool.type}</p>
                <div className="text-[var(--primary)] font-medium">View Integration &rarr;</div>
              </div>
            </Link>
          ))}
          {tools.length === 0 && (
            <div className="col-span-full p-8 text-center text-zinc-500 border border-dashed border-[var(--border)] rounded-2xl">
              No tools available yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
