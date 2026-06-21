"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  DollarSign,
  Plus,
  Trash2,
  CheckCircle,
  FolderLock,
  Pencil
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { API_URL, authHeaders, formatMoney, Plan } from "@/lib/platform";

export default function SubscriptionPlansPage() {
  const { token } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form State for Plan Creation
  const [planForm, setPlanForm] = useState({ 
    name: "", 
    amount: "9900", 
    maxChromeProfiles: "10", 
    maxWebsites: "5",
    chromeExtensionAccess: true,
    widgetAccess: true
  });
  
  // Action State (Loading indicators)
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit Plan State
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    amount: "",
    maxChromeProfiles: "",
    maxWebsites: "",
    chromeExtensionAccess: true,
    widgetAccess: true
  });

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const plansResponse = await axios.get(`${API_URL}/platform/plans`, { headers: authHeaders(token) });
      setPlans(plansResponse.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load subscription plans.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Plan Operations
  async function handleCreatePlan(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setActionLoading("create-plan");
    try {
      await axios.post(`${API_URL}/platform/admin/plans`, {
        name: planForm.name,
        amount: Number(planForm.amount),
        maxChromeProfiles: planForm.maxChromeProfiles === "" ? null : Number(planForm.maxChromeProfiles),
        maxWebsites: planForm.maxWebsites === "" ? null : Number(planForm.maxWebsites),
        chromeExtensionAccess: planForm.chromeExtensionAccess,
        widgetAccess: planForm.widgetAccess,
        billingCycle: "monthly",
        status: "active",
      }, { headers: authHeaders(token) });
      setPlanForm({ 
        name: "", 
        amount: "9900", 
        maxChromeProfiles: "10", 
        maxWebsites: "5",
        chromeExtensionAccess: true,
        widgetAccess: true
      });
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not create plan.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTogglePlan(plan: Plan) {
    if (!token) return;
    const nextStatus = plan.status === "active" ? "inactive" : "active";
    setActionLoading(`plan-status-${plan.id}`);
    try {
      await axios.patch(
        `${API_URL}/platform/admin/plans/${plan.id}`, 
        { status: nextStatus }, 
        { headers: authHeaders(token) }
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not toggle plan status.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeletePlan(plan: Plan) {
    if (!token) return;
    const confirmText = plan.status === "active" 
      ? `Are you sure you want to disable or delete the subscription "${plan.name}"? Active users will be allowed to finish their current cycle, but new users won't be allowed to subscribe.`
      : `Delete the plan "${plan.name}"?`;
    if (!confirm(confirmText)) return;

    setActionLoading(`plan-delete-${plan.id}`);
    try {
      const response = await axios.delete(
        `${API_URL}/platform/admin/plans/${plan.id}`, 
        { headers: authHeaders(token) }
      );
      if (response.data?.message) {
        alert(response.data.message);
      }
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not delete plan.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !editingPlan) return;
    setActionLoading("edit-plan");
    try {
      await axios.patch(
        `${API_URL}/platform/admin/plans/${editingPlan.id}`,
        {
          name: editForm.name,
          amount: Number(editForm.amount),
          maxChromeProfiles: editForm.maxChromeProfiles === "" ? null : Number(editForm.maxChromeProfiles),
          maxWebsites: editForm.maxWebsites === "" ? null : Number(editForm.maxWebsites),
          chromeExtensionAccess: editForm.chromeExtensionAccess,
          widgetAccess: editForm.widgetAccess
        },
        { headers: authHeaders(token) }
      );
      setEditingPlan(null);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not modify plan.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-950/20 dark:bg-red-950/10">
        <h3 className="font-semibold text-lg">Error Loading Subscription Plans</h3>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Subscription Plans</h1>
        <p className="text-zinc-500 mt-1.5">Configure platform tiers, pricing, features, and device limits.</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Create Plan Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-[var(--primary)]" />
            Create Subscription Plan
          </h3>
          <form onSubmit={handleCreatePlan} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Plan Name</label>
              <input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Solo Pro, Corporate, etc."
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Amount (NGN Kobo)</label>
              <input
                value={planForm.amount}
                onChange={(e) => setPlanForm({ ...planForm, amount: e.target.value })}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="e.g. 9900 for ₦99"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Max Chrome Profiles</label>
              <input
                value={planForm.maxChromeProfiles}
                onChange={(e) => setPlanForm({ ...planForm, maxChromeProfiles: e.target.value })}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="e.g. 10"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500">Max Website Tunnels</label>
              <input
                value={planForm.maxWebsites}
                onChange={(e) => setPlanForm({ ...planForm, maxWebsites: e.target.value })}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="e.g. 5"
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-4 mt-2 border-t border-[var(--border)] pt-4">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.chromeExtensionAccess}
                    onChange={(e) => setPlanForm({ ...planForm, chromeExtensionAccess: e.target.checked })}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Chrome Extension Access
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.widgetAccess}
                    onChange={(e) => setPlanForm({ ...planForm, widgetAccess: e.target.checked })}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Website Widget Access
                </label>
              </div>
              <button 
                type="submit" 
                disabled={actionLoading === "create-plan"}
                className="rounded-xl bg-[var(--primary)] px-6 py-2.5 font-medium text-white shadow hover:bg-[var(--accent)] transition-colors text-sm disabled:opacity-50"
              >
                {actionLoading === "create-plan" ? "Creating..." : "Create Plan"}
              </button>
            </div>
          </form>
        </div>

        {/* Plans List */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <FolderLock className="w-5 h-5 text-[var(--primary)]" />
            Active Subscription Products
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="relative flex flex-col justify-between rounded-xl bg-zinc-50 p-5 border border-[var(--border)] dark:bg-zinc-950/40">
                <div>
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-lg text-[var(--foreground)]">{plan.name}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      plan.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-[var(--primary)]">
                    {formatMoney(plan.amount, plan.currency)}
                    <span className="text-xs font-normal text-zinc-500"> / month</span>
                  </p>
                  
                  <ul className="mt-4 flex flex-col gap-1.5 text-xs text-zinc-500">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      {plan.maxChromeProfiles ?? "Unlimited"} Chrome profiles
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      {plan.maxWebsites ?? "Unlimited"} Websites integration
                    </li>
                  </ul>
                </div>

                <div className="mt-6 flex gap-2 border-t border-[var(--border)] pt-4">
                  <button 
                    onClick={() => handleTogglePlan(plan)}
                    disabled={actionLoading === `plan-status-${plan.id}`}
                    className="flex-1 rounded-lg border border-[var(--border)] py-1.5 text-xs font-medium bg-white hover:bg-zinc-100 transition-colors dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {plan.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingPlan(plan);
                      setEditForm({
                        name: plan.name,
                        amount: String(plan.amount),
                        maxChromeProfiles: plan.maxChromeProfiles === null ? "" : String(plan.maxChromeProfiles),
                        maxWebsites: plan.maxWebsites === null ? "" : String(plan.maxWebsites),
                        chromeExtensionAccess: plan.chromeExtensionAccess,
                        widgetAccess: plan.widgetAccess
                      });
                    }}
                    disabled={actionLoading === `plan-delete-${plan.id}`}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-350 transition-colors"
                    title="Modify plan"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan)}
                    disabled={actionLoading === `plan-delete-${plan.id}`}
                    className="rounded-lg border border-red-200 p-1.5 hover:bg-red-50 text-red-600 transition-colors dark:border-red-950/20 dark:hover:bg-red-950/10 disabled:opacity-50"
                    title="Delete plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[var(--border)] p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-xl font-bold text-[var(--foreground)]">Modify Subscription Plan</h3>
              <p className="text-sm text-zinc-500 mt-1">Update plan settings, limits, and pricing.</p>
            </div>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Plan Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] dark:text-white"
                  placeholder="Solo Pro, Corporate, etc."
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Amount (NGN Kobo)</label>
                <input
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] dark:text-white"
                  placeholder="e.g. 9900 for ₦99"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500">Max Chrome Profiles</label>
                  <input
                    value={editForm.maxChromeProfiles}
                    onChange={(e) => setEditForm({ ...editForm, maxChromeProfiles: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] dark:text-white"
                    placeholder="Unlimited"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500">Max Website Tunnels</label>
                  <input
                    value={editForm.maxWebsites}
                    onChange={(e) => setEditForm({ ...editForm, maxWebsites: e.target.value })}
                    className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] dark:text-white"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
                <label className="flex items-center gap-2 text-sm text-zinc-650 dark:text-zinc-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.chromeExtensionAccess}
                    onChange={(e) => setEditForm({ ...editForm, chromeExtensionAccess: e.target.checked })}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Chrome Extension Access
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-650 dark:text-zinc-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.widgetAccess}
                    onChange={(e) => setEditForm({ ...editForm, widgetAccess: e.target.checked })}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Website Widget Access
                </label>
              </div>

              <div className="flex gap-3 justify-end mt-4 border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "edit-plan"}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                >
                  {actionLoading === "edit-plan" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
