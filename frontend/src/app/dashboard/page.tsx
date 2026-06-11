"use client";

import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardRouter() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === "superadmin") {
        router.push("/dashboard/superadmin");
      } else if (user.role === "org_admin") {
        router.push("/dashboard/org-admin");
      } else {
        router.push("/dashboard/solo");
      }
    }
  }, [user, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-zinc-500">Loading your dashboard...</p>
      </div>
    </div>
  );
}
