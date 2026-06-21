"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Monitor, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  apiErrorMessage,
  ChromeProfile,
  createChromeIntegration,
  fetchOverview,
  fetchProfileActivities,
  formatDate,
  OverviewResponse,
  regenerateChromeIntegration,
} from "@/lib/platform";

export default function ChromeExtensionToolPage() {
  const { token } = useAuthStore();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [integrationName, setIntegrationName] = useState("Chrome Extension Integration");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileActivities, setProfileActivities] = useState<Array<{ id: string; actionType: string; description: string; metadata?: Record<string, unknown>; createdAt: string }>>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    fetchOverview(token).then(setOverview).catch(console.error);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleProfileActivities(profileId: string) {
    if (selectedProfileId === profileId) {
      setSelectedProfileId(null);
      setProfileActivities([]);
      return;
    }
    setSelectedProfileId(profileId);
    setLoadingActivities(true);
    try {
      setProfileActivities(await fetchProfileActivities(token, profileId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivities(false);
    }
  }

  async function handleCreateIntegration(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createChromeIntegration(token, integrationName);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create the integration."));
    }
  }

  async function handleRegenerate() {
    setError("");
    try {
      await regenerateChromeIntegration(token);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not regenerate the integration code."));
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  if (!overview) return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;

  const chrome = overview.tools.chromeExtension;
  const integration = chrome.integration;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/tools" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-500 hover:text-[var(--foreground)]">
        <ArrowLeft className="h-4 w-4" /> Back to Tools
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Monitor className="h-6 w-6 text-[var(--primary)]" />
            <h1 className="text-2xl font-bold">Chrome Extension</h1>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            <strong className="text-zinc-900 dark:text-zinc-100">{chrome.connectedProfiles.length}</strong> of {chrome.profileLimit ?? "Unlimited"} profile slots used
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chrome.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>{chrome.status}</span>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      {chrome.overLimit && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Profile limit reached. Upgrade your plan to connect more devices.</p>}

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        {!integration ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Monitor className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">No integration set up yet. Create one to get your integration code.</p>
            <form onSubmit={handleCreateIntegration} className="mt-2 flex w-full max-w-sm flex-col gap-3">
              <input
                value={integrationName}
                onChange={(event) => setIntegrationName(event.target.value)}
                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                required
              />
              <button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white">Add Chrome Extension</button>
            </form>
          </div>
        ) : (
          <div>
            <p className="text-sm text-zinc-500">Integration Details</p>
            <h3 className="mt-1 font-semibold">{integration.name}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-950">{integration.integrationCode}</code>
              <button onClick={() => copy(integration.integrationCode)} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <Copy className="h-4 w-4" />{copied ? "Copied" : "Copy"}
              </button>
              <button onClick={handleRegenerate} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <RefreshCw className="h-4 w-4" />Regenerate
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Created {formatDate(integration.createdAt)} · {integration.status}</p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-zinc-50 p-6 dark:bg-zinc-950/30">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Extension Setup Guide</h2>
        <ol className="mt-4 flex flex-col gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">1</span>
            <div>
              <strong className="text-zinc-900 dark:text-zinc-200">Load the Extension:</strong> Open <code>chrome://extensions/</code> in your browser, enable <strong className="text-zinc-800 dark:text-zinc-300">Developer Mode</strong> (toggle in top-right), click <strong className="text-zinc-800 dark:text-zinc-300">Load unpacked</strong>, and select the <code>new-chrome-extension/</code> folder.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">2</span>
            <div>
              <strong className="text-zinc-900 dark:text-zinc-200">Enable Microphone Permissions:</strong> Because TernKonnect is a voice-controlled accessibility assistant, it <strong className="text-zinc-900 dark:text-zinc-200">requires microphone permission</strong>. If you are not prompted automatically on install, click the extension icon and choose the <strong className="text-zinc-800 dark:text-zinc-300">Microphone Setup</strong> option to grant access.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">3</span>
            <div>
              <strong className="text-zinc-900 dark:text-zinc-200">Integrate using the Code:</strong> Copy your <strong className="text-zinc-800 dark:text-zinc-300">Integration Code</strong> above, open the extension settings, and enter your email and code to link the device profile to your account.
            </div>
          </li>
        </ol>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Connected profiles</h2>
        {chrome.connectedProfiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-zinc-500">No devices connected yet.</p>
            <p className="text-xs text-zinc-400">Install the extension and enter the integration code above to connect a device.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-2">Profile</th>
                  <th>Profile ID</th>
                  <th>First Seen</th>
                  <th>Last Active</th>
                  <th>Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chrome.connectedProfiles.map((profile: ChromeProfile) => (
                  <Fragment key={profile.id}>
                    <tr className="border-t border-[var(--border)]">
                      <td className="py-3 font-medium">
                        <div>{profile.profileName}</div>
                        {profile.chromeEmail && (
                          <div className="text-xs font-normal text-zinc-400 mt-0.5">{profile.chromeEmail}</div>
                        )}
                      </td>
                      <td className="font-mono text-xs">{profile.profileId}</td>
                      <td>{formatDate(profile.firstSeenAt)}</td>
                      <td>{formatDate(profile.lastActiveAt)}</td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${profile.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                          {profile.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => toggleProfileActivities(profile.id)}
                          className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold transition hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                          {selectedProfileId === profile.id ? "Hide Activities" : "View Activities"}
                        </button>
                      </td>
                    </tr>
                    {selectedProfileId === profile.id && (
                      <tr className="bg-zinc-50/50 dark:bg-zinc-950/30">
                        <td colSpan={6} className="border-t border-[var(--border)] px-4 py-3">
                          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Extension Activities</div>
                          {loadingActivities ? (
                            <div className="animate-pulse py-2 text-xs text-zinc-400">Loading activities...</div>
                          ) : profileActivities.length === 0 ? (
                            <div className="py-2 text-xs text-zinc-400">No activities tracked yet.</div>
                          ) : (
                            <div className="grid max-h-60 gap-2 overflow-y-auto pr-2">
                              {profileActivities.map((act) => (
                                <div key={act.id} className="flex items-start justify-between border-b border-zinc-100 pb-2 last:border-0 last:pb-0 dark:border-zinc-800">
                                  <div>
                                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{act.actionType}</div>
                                    <div className="mt-0.5 text-xs text-zinc-500">{act.description}</div>
                                    {act.metadata && Object.keys(act.metadata).length > 0 && (
                                      <pre className="mt-1 max-w-lg overflow-x-auto rounded bg-zinc-100 p-1.5 text-[10px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                                        {JSON.stringify(act.metadata, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                  <div className="font-mono text-[10px] text-zinc-400">{formatDate(act.createdAt)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
