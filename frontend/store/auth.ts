"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { authApi } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; surname: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const tokenData = await authApi.login(email, password);
          localStorage.setItem("access_token", tokenData.access_token);
          const user = await authApi.me();
          set({ token: tokenData.access_token, user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          await authApi.register(data);
          // Kayıt sonrası otomatik giriş
          const tokenData = await authApi.login(data.email, data.password);
          localStorage.setItem("access_token", tokenData.access_token);
          const user = await authApi.me();
          set({ token: tokenData.access_token, user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null });
      },

      fetchMe: async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        try {
          const user = await authApi.me();
          set({ user, token });
        } catch {
          localStorage.removeItem("access_token");
          set({ user: null, token: null });
        }
      },
    }),
    { name: "auth-store", partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);

// Yardımcı selectors
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAdmin = () => useAuthStore((s) => s.user?.role.role_name === "admin");
export const useIsContentManager = () =>
  useAuthStore((s) =>
    s.user?.role.role_name === "content_manager" || s.user?.role.role_name === "admin"
  );
