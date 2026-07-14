"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session — handle stale refresh tokens gracefully
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          // Refresh token is invalid/expired — clear the stale session
          console.warn("Session refresh failed, signing out:", error.message);
          supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
        setLoading(false);
      })
      .catch(() => {
        // Network or unexpected error — treat as signed out
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes (including TOKEN_REFRESHED failures)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && !session) {
        // Token refresh failed — force sign out
        console.warn("Token refresh failed, forcing sign out");
        supabase.auth.signOut();
        setUser(null);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  }, []);

  return {
    user,
    loading,
    signOut,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
  };
}
