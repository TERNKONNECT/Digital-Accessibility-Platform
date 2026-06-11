import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

const API_URL = "http://localhost:9001/api";

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
  logout: () => void;
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
        } catch (error: any) {
          throw new Error(error.response?.data?.error || "Login failed");
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
