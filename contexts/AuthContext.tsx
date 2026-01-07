'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile } from '@/types/supabase';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ data?: Profile | null; error?: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });

  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);

  // Initialize Supabase client and auth state
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If Supabase isn't configured, don't show loading
    if (!supabaseUrl || !supabaseKey) {
      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        isAuthenticated: false,
      });
      return;
    }

    // Create client if not already created
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient<Database>(supabaseUrl, supabaseKey);
    }

    const supabase = supabaseRef.current;
    let mounted = true;

    // Fetch profile helper
    const fetchProfile = async (userId: string): Promise<Profile | null> => {
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
    };

    // Initialize auth
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('getSession error:', error);
        }

        if (!mounted) return;

        if (session?.user) {
          // Update state immediately with user
          setState({
            user: session.user,
            profile: null,
            session,
            loading: false,
            isAuthenticated: true,
          });

          // Fetch profile in background
          fetchProfile(session.user.id).then(profile => {
            if (mounted && profile) {
              setState(prev => ({ ...prev, profile }));
            }
          }).catch(() => {});
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('initAuth error:', error);
        if (mounted) {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          // Update state immediately with user, then fetch profile in background
          setState({
            user: session.user,
            profile: null,
            session,
            loading: false,
            isAuthenticated: true,
          });

          // Fetch profile in background (don't block auth)
          fetchProfile(session.user.id).then(profile => {
            if (mounted && profile) {
              setState(prev => ({ ...prev, profile }));
            }
          }).catch(() => {});
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    if (!supabaseRef.current) return;
    await supabaseRef.current.auth.signOut();
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!supabaseRef.current) return { error: new Error('Supabase not configured') };
    if (!state.user) return { error: new Error('Not authenticated') };

    const client = supabaseRef.current as any;
    const { data, error } = await client
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
