"use client";

import { useAuthStore } from "@/store/authStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Home, Wrench, CreditCard, History, ShieldCheck, Users, BarChart3, Settings, Layers, Monitor, Activity, UserCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.mustChangePassword && pathname !== "/dashboard/profile") {
      router.push("/dashboard/profile");
    }
  }, [isAuthenticated, user, pathname, router]);

  if (!isAuthenticated || !user) return null;
  if (user.mustChangePassword && pathname !== "/dashboard/profile") return null;

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-[var(--border)] flex flex-col">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--primary)]">Ternkonnect</h2>
          <p className="text-sm text-zinc-500 capitalize">{user.role.replace("_", " ")}</p>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {user.role !== "superadmin" ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Home className="w-5 h-5 text-zinc-500" />
                <span>Dashboard</span>
              </Link>

              <Link href="/dashboard/tools" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Wrench className="w-5 h-5 text-zinc-500" />
                <span>Tools</span>
              </Link>
              <Link href="/dashboard/billing" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <CreditCard className="w-5 h-5 text-zinc-500" />
                <span>Billing</span>
              </Link>
              <Link href="/dashboard/activity" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <History className="w-5 h-5 text-zinc-500" />
                <span>Activity</span>
              </Link>
              {user.role === "org_admin" && (
                <Link href="/dashboard/admin" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-zinc-500" />
                  <span>Admin Portal</span>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/dashboard/superadmin" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Home className="w-5 h-5 text-zinc-500" />
                <span>Overview</span>
              </Link>

              <div className="mt-4 px-3 mb-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Management
              </div>
              <Link href="/dashboard/superadmin/subscriptions" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Layers className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">Subscription Plans</span>
              </Link>
              <Link href="/dashboard/superadmin/active-subscriptions" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Activity className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">Active Subscriptions</span>
              </Link>
              <Link href="/dashboard/superadmin/users" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Users className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">User Management</span>
              </Link>
              <Link href="/dashboard/superadmin/tools" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Monitor className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">Tool Management</span>
              </Link>
              <Link href="/dashboard/superadmin/my-tools" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Wrench className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">My Internal Tools</span>
              </Link>

              <div className="mt-4 px-3 mb-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Finance & Settings
              </div>
              <Link href="/dashboard/superadmin/payments" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <BarChart3 className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">Revenue & Payments</span>
              </Link>
              <Link href="/dashboard/superadmin/configuration" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Settings className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">Configuration</span>
              </Link>

              <div className="mt-4 px-3 mb-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                System
              </div>
              <Link href="/dashboard/activity" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <History className="w-5 h-5 text-zinc-500" />
                <span className="text-sm">System Activity</span>
              </Link>
            </>
          )}

          <div className="mt-4 px-3 mb-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Account
          </div>
          <Link href="/dashboard/profile" className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <UserCircle className="w-5 h-5 text-zinc-500" />
            <span className="text-sm">My Profile</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <button 
            onClick={() => { logout(); router.push("/login"); }}
            className="flex items-center gap-3 p-3 w-full rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
