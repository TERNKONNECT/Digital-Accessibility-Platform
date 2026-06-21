import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001/api";

export type PlatformStatus = "active" | "inactive" | "pending" | "suspended";

export interface ActivityEntry {
  id: string;
  actionType: string;
  description: string;
  createdAt: string;
}

export interface ChromeProfile {
  id: string;
  profileName: string;
  profileId: string;
  chromeEmail?: string;
  firstSeenAt: string;
  lastActiveAt: string;
  status: PlatformStatus;
}

export interface ChromeIntegration {
  id: string;
  name: string;
  integrationCode: string;
  status: PlatformStatus;
  createdAt: string;
}

export interface WidgetSite {
  id: string;
  websiteName: string;
  websiteUrl: string;
  widgetId: string;
  integrationCode: string;
  embedScript: string;
  status: PlatformStatus;
  usageCount: number;
  widgetLoads: number;
  dailyUsage: number;
  weeklyUsage: number;
  monthlyUsage: number;
}

export interface SubscriptionSummary {
  id: string;
  planName: string;
  status: PlatformStatus;
  price: number;
  currency: string;
  billingCycle: "monthly" | "yearly";
  renewalDate: string | null;
  chromeExtensionAccess: boolean;
  widgetAccess: boolean;
  maxChromeProfiles: number | null;
  maxWebsites: number | null;
}

export interface Payment {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  reference?: string | null;
  paidAt?: string | null;
  createdAt: string;
  user?: { name: string; email: string; subscription?: { status?: PlatformStatus; planDetails?: { name: string; status?: PlatformStatus } | null } | null } | null;
}

export interface OverviewResponse {
  subscription: SubscriptionSummary;
  totals: {
    toolsEnabled: number;
    widgetWebsites: number;
    chromeProfiles: number;
    activeChromeProfiles: number;
  };
  tools: {
    chromeExtension: {
      status: PlatformStatus;
      integration: ChromeIntegration | null;
      connectedProfiles: ChromeProfile[];
      profileLimit: number | null;
      lastActivity: string | null;
      overLimit: boolean;
    };
    widget: {
      status: PlatformStatus;
      websites: WidgetSite[];
      websiteLimit: number | null;
      lastActivity: string | null;
      overLimit: boolean;
    };
  };
  recentActivity: ActivityEntry[];
  payments: Payment[];
}

export interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: "monthly" | "yearly";
  chromeExtensionAccess: boolean;
  widgetAccess: boolean;
  maxChromeProfiles: number | null;
  maxWebsites: number | null;
  status: PlatformStatus;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: PlatformStatus;
  subscription?: { plan?: string; endsAt?: string | null; status?: PlatformStatus; planDetails?: { name: string; status?: PlatformStatus } | null } | null;
  chromeIntegration?: { integrationCode: string; status?: PlatformStatus; profiles?: ChromeProfile[] } | null;
  widgetSites?: WidgetSite[];
}

export interface AdminResponse {
  totals: Record<string, number>;
  analytics: Record<string, number | null>;
  users: AdminUser[];
  payments: Payment[];
}

export function authHeaders(token: string | null) {
  return { Authorization: `Bearer ${token}` };
}

export function formatMoney(amount = 0, currency = "NGN") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

// Date-only — use for billing/renewal dates, where the time of day a
// subscription happened to be created at isn't meaningful to show.
export function formatDateOnly(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export async function fetchOverview(token: string | null): Promise<OverviewResponse> {
  const response = await axios.get(`${API_URL}/platform/overview`, { headers: authHeaders(token) });
  return response.data;
}

export async function createChromeIntegration(token: string | null, name: string): Promise<ChromeIntegration> {
  const response = await axios.post(`${API_URL}/platform/chrome-integration`, { name }, { headers: authHeaders(token) });
  return response.data;
}

export async function regenerateChromeIntegration(token: string | null): Promise<ChromeIntegration> {
  const response = await axios.post(`${API_URL}/platform/chrome-integration/regenerate`, {}, { headers: authHeaders(token) });
  return response.data;
}

export async function createWidget(token: string | null, websiteName: string, websiteUrl: string): Promise<WidgetSite> {
  const response = await axios.post(`${API_URL}/platform/widgets`, { websiteName, websiteUrl }, { headers: authHeaders(token) });
  return response.data;
}

export async function fetchProfileActivities(token: string | null, profileId: string): Promise<ActivityEntry[]> {
  const response = await axios.get(`${API_URL}/platform/chrome/profiles/${profileId}/activities`, { headers: authHeaders(token) });
  return response.data;
}

export function apiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return fallback;
}
