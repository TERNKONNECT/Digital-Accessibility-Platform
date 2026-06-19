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
  subscription?: { plan?: string; planDetails?: { name: string } | null } | null;
  chromeIntegration?: { integrationCode: string; profiles?: ChromeProfile[] } | null;
  widgetSites?: WidgetSite[];
}

export interface AdminResponse {
  totals: Record<string, number>;
  analytics: Record<string, number | null>;
  users: AdminUser[];
}

export function authHeaders(token: string | null) {
  return { Authorization: `Bearer ${token}` };
}

export function formatMoney(amount = 0, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export async function fetchOverview(token: string | null): Promise<OverviewResponse> {
  const response = await axios.get(`${API_URL}/platform/overview`, { headers: authHeaders(token) });
  return response.data;
}
