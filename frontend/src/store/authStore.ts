import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios, { AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "org_admin" | "solo" | "org_user";
  organizationId?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role?: string, organizationName?: string) => Promise<{ message: string, verificationLink?: string }>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (email: string, otp: string, password: string) => Promise<{ message: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const res = await axios.post(`${API_URL}/auth/login`, { email, password });
          const { token, user } = res.data;
          set({ user, token, isAuthenticated: true });
        } catch (error: unknown) {
          if (error instanceof AxiosError) {
            const data = error.response?.data as { error?: string } | undefined;
            throw new Error(data?.error || "Login failed");
          }
          throw new Error("Login failed");
        }
      },

      signup: async (name, email, password, role, organizationName) => {
        try {
          const res = await axios.post(`${API_URL}/auth/register`, { name, email, password, role, organizationName });
          return res.data;
        } catch (error: any) {
          throw new Error(error.response?.data?.error || "Signup failed");
        }
      },

      forgotPassword: async (email) => {
        try {
          const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
          return res.data;
        } catch (error: any) {
          throw new Error(error.response?.data?.error || "Failed to process request");
        }
      },

      resetPassword: async (email, otp, password) => {
        try {
          const res = await axios.post(`${API_URL}/auth/reset-password`, { email, otp, password });
          return res.data;
        } catch (error: any) {
          throw new Error(error.response?.data?.error || "Password reset failed");
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "ternkonnect-auth",
    }
  )
);
