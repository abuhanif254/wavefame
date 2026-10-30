"use client";

import { create } from "zustand";
import type { UserProfile } from "@/types/auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isAuthModalOpen: boolean;

  // Actions
  initAuth: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, password?: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password?: string, fullName?: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  consumeFreeTrial: () => Promise<void>;
  deductCredit: (amount?: number) => Promise<boolean>;
  addCredits: (amount: number) => Promise<void>;
  toggleDevAdminMode: () => void;
  refreshProfile: () => Promise<void>;
}

const LOCAL_STORAGE_USER_KEY = "waveframe_user_profile";

function getLocalStoredUser(): UserProfile {
  if (typeof window === "undefined") {
    return {
      id: "usr_guest_demo",
      email: "creator@waveframe.studio",
      full_name: "Demo Creator",
      credits: 0,
      has_used_free_trial: false,
      is_admin: true, // Default to admin in local dev for seamless inspection
    };
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  const defaultUser: UserProfile = {
    id: "usr_guest_" + Math.random().toString(36).substring(2, 9),
    email: "creator@waveframe.studio",
    full_name: "Waveframe Creator",
    credits: 1, // Pre-gift 1 credit in dev preview to try instant unlock
    has_used_free_trial: false,
    is_admin: true,
  };
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(defaultUser));
  return defaultUser;
}

function saveLocalStoredUser(user: UserProfile | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: true,
  isConfigured: isSupabaseConfigured,
  isAuthModalOpen: false,

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  initAuth: async () => {
    set({ isLoading: true });

    if (!isSupabaseConfigured) {
      // Local fallback mode
      const localUser = getLocalStoredUser();
      set({ user: localUser, isLoading: false, isConfigured: false });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      set({ user: getLocalStoredUser(), isLoading: false, isConfigured: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch user profile from database
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          set({
            user: {
              id: profile.id,
              email: profile.email || session.user.email || "",
              full_name: profile.full_name || session.user.user_metadata?.full_name,
              avatar_url: profile.avatar_url || session.user.user_metadata?.avatar_url,
              credits: profile.credits ?? 0,
              has_used_free_trial: profile.has_used_free_trial ?? false,
              is_admin: profile.is_admin ?? false,
            },
            isLoading: false,
          });
        } else {
          // Profile trigger might still be running or row not created yet
          set({
            user: {
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || "Creator",
              credits: 0,
              has_used_free_trial: false,
              is_admin: false,
            },
            isLoading: false,
          });
        }
      } else {
        set({ user: null, isLoading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          await get().refreshProfile();
        } else {
          set({ user: null });
        }
      });
    } catch {
      // Graceful fallback to local
      set({ user: getLocalStoredUser(), isLoading: false });
    }
  },

  refreshProfile: async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured) {
      const u = getLocalStoredUser();
      set({ user: u });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      set({
        user: {
          id: profile.id,
          email: profile.email || session.user.email || "",
          full_name: profile.full_name || session.user.user_metadata?.full_name,
          avatar_url: profile.avatar_url || session.user.user_metadata?.avatar_url,
          credits: profile.credits ?? 0,
          has_used_free_trial: profile.has_used_free_trial ?? false,
          is_admin: profile.is_admin ?? false,
        },
      });
    }
  },

  signInWithEmail: async (email, password = "password123") => {
    if (!isSupabaseConfigured) {
      const updated: UserProfile = {
        id: "usr_" + btoa(email).substring(0, 8),
        email,
        full_name: email.split("@")[0],
        credits: 1,
        has_used_free_trial: false,
        is_admin: email.includes("admin"),
      };
      saveLocalStoredUser(updated);
      set({ user: updated, isAuthModalOpen: false });
      return {};
    }

    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Database client unavailable." };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    await get().refreshProfile();
    set({ isAuthModalOpen: false });
    return {};
  },

  signUpWithEmail: async (email, password = "password123", fullName) => {
    if (!isSupabaseConfigured) {
      const updated: UserProfile = {
        id: "usr_" + btoa(email).substring(0, 8),
        email,
        full_name: fullName || email.split("@")[0],
        credits: 0,
        has_used_free_trial: false,
        is_admin: false,
      };
      saveLocalStoredUser(updated);
      set({ user: updated, isAuthModalOpen: false });
      return {};
    }

    const supabase = getSupabaseClient();
    if (!supabase) return { error: "Database client unavailable." };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split("@")[0] },
      },
    });

    if (error) return { error: error.message };

    await get().refreshProfile();
    set({ isAuthModalOpen: false });
    return {};
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      const googleUser: UserProfile = {
        id: "usr_google_demo",
        email: "google.creator@waveframe.studio",
        full_name: "Google Creator",
        credits: 1,
        has_used_free_trial: false,
        is_admin: true,
      };
      saveLocalStoredUser(googleUser);
      set({ user: googleUser, isAuthModalOpen: false });
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
      });
    }
  },

  signOut: async () => {
    if (!isSupabaseConfigured) {
      saveLocalStoredUser(null);
      set({ user: null });
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({ user: null });
  },

  consumeFreeTrial: async () => {
    const cur = get().user;
    if (!cur) return;
    const updated = { ...cur, has_used_free_trial: true };
    set({ user: updated });

    if (!isSupabaseConfigured) {
      saveLocalStoredUser(updated);
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase
        .from("profiles")
        .update({ has_used_free_trial: true, updated_at: new Date().toISOString() })
        .eq("id", cur.id);
    }
  },

  deductCredit: async (amount = 1) => {
    const cur = get().user;
    if (!cur || cur.credits < amount) return false;

    const nextCredits = cur.credits - amount;
    const updated = { ...cur, credits: nextCredits };
    set({ user: updated });

    if (!isSupabaseConfigured) {
      saveLocalStoredUser(updated);
      return true;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from("profiles")
        .update({ credits: nextCredits, updated_at: new Date().toISOString() })
        .eq("id", cur.id);
      if (error) return false;
    }
    return true;
  },

  addCredits: async (amount: number) => {
    const cur = get().user;
    if (!cur) return;
    const nextCredits = cur.credits + amount;
    const updated = { ...cur, credits: nextCredits };
    set({ user: updated });

    if (!isSupabaseConfigured) {
      saveLocalStoredUser(updated);
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase
        .from("profiles")
        .update({ credits: nextCredits, updated_at: new Date().toISOString() })
        .eq("id", cur.id);
    }
  },

  toggleDevAdminMode: () => {
    const cur = get().user;
    if (!cur) return;
    const updated = { ...cur, is_admin: !cur.is_admin };
    set({ user: updated });
    saveLocalStoredUser(updated);
  },
}));
