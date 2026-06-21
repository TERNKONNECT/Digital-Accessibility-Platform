"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, UserCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setSavingProfile(true);
    try {
      const res = await updateProfile(name, email);
      if (res.verificationRequired) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setProfileMessage("Profile updated.");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      setPasswordMessage(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-zinc-500">Manage your account details and password.</p>
      </div>

      {user?.mustChangePassword && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-950/20 dark:bg-amber-950/10 dark:text-amber-300 lg:max-w-2xl">
          You&apos;re signed in with a temporary password — set a new one below to continue.
        </div>
      )}

      <div className="grid gap-6 lg:max-w-2xl">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <UserCircle className="w-5 h-5 text-[var(--primary)]" />
            Edit Profile
          </h3>
          {profileError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{profileError}</div>}
          {profileMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{profileMessage}</div>}
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
              <p className="mt-1 text-xs text-zinc-400">Changing your email will require verifying it with a new code before you can log in again.</p>
            </div>
            <button type="submit" disabled={savingProfile} className="w-fit mt-2 bg-[var(--primary)] text-white font-medium py-2 px-5 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50">
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-[var(--primary)]" />
            Change Password
          </h3>
          {passwordError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{passwordError}</div>}
          {passwordMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{passwordMessage}</div>}
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input type={showPasswords ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={savingPassword} className="w-fit mt-2 bg-[var(--primary)] text-white font-medium py-2 px-5 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50">
              {savingPassword ? "Saving..." : "Update Password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
