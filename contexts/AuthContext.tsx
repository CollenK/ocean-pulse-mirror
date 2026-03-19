'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile } from '@/types/supabase';
import { consumeAuthRedirect } from '@/lib/auth-redirect';
import { isDemoUser as checkIsDemoUser } from '@/lib/demo/demo-config';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isDemoUser: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ data?: Profile | null; error?: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_AUTH_STATE: AuthState = {
  user: null,
  profile: null,
  session: null,
  loading: false,
  isAuthenticated: false,
  isDemoUser: false,
};

function buildAuthState(session: Session): AuthState {
  return {
    user: session.user,
    profile: null,
    session,
    loading: false,
    isAuthenticated: true,
    isDemoUser: checkIsDemoUser(session.user.id, session.user.email),
  };
}

async function fetchProfile(supabase: SupabaseClient<Database>, userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

function fetchProfileInBackground(
  supabase: SupabaseClient<Database>,
  userId: string,
  mounted: { current: boolean },
  setState: React.Dispatch<React.SetStateAction<AuthState>>
) {
  fetchProfile(supabase, userId).then(profile => {
    if (mounted.current && profile) {
      setState(prev => ({ ...prev, profile }));
    }
  }).catch(() => {});
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ...EMPTY_AUTH_STATE,
    loading: true,
  });

  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setState(EMPTY_AUTH_STATE);
      return;
    }

    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient<Database>(supabaseUrl, supabaseKey);
    }

    const supabase = supabaseRef.current;
    const mounted = { current: true };

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('getSession error:', error);
        if (!mounted.current) return;

        if (session?.user) {
          setState(buildAuthState(session));
          fetchProfileInBackground(supabase, session.user.id, mounted, setState);
        } else {
          setState(EMPTY_AUTH_STATE);
        }
      } catch (error) {
        console.error('initAuth error:', error);
        if (mounted.current) setState(EMPTY_AUTH_STATE);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return;

        if (!session?.user) {
          setState(EMPTY_AUTH_STATE);
          return;
        }

        setState(buildAuthState(session));

        if (event === 'SIGNED_IN') {
          const redirectPath = consumeAuthRedirect();
          if (redirectPath && redirectPath !== window.location.pathname) {
            window.location.replace(redirectPath);
          }
        }

        fetchProfileInBackground(supabase, session.user.id, mounted, setState);
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseRef.current) return;
    await supabaseRef.current.auth.signOut();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!supabaseRef.current) return { error: new Error('Supabase not configured') };
    if (!state.user) return { error: new Error('Not authenticated') };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseRef.current as any)
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id)
      .select()
      .single();

    if (!error && data) {
      setState(prev => ({ ...prev, profile: data as Profile }));
    }

    return { data, error };
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
