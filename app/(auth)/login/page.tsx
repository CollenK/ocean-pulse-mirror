'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/Icon';
import { storeAuthRedirect } from '@/lib/auth-redirect';

function LoginContent() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true');

  // Get redirect URL from query params, default to interactive map
  const redirectTo = searchParams.get('redirect') || '/ocean-pulse-app';

  // Store the redirect path in sessionStorage so it survives the OAuth round-trip
  useEffect(() => {
    if (redirectTo) {
      storeAuthRedirect(redirectTo);
    }
  }, [redirectTo]);

  const signInWithProvider = async (provider: 'google') => {
    try {
      setIsLoading(provider);
      setError(null);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(null);
    }
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading('email');
      setError(null);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to the intended destination on success
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
      setIsLoading(null);
    }
  };

  const signUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading('email');

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // If the user session exists, email confirmation is disabled and they are signed in
      if (data.session) {
        router.push(redirectTo);
        router.refresh();
      } else {
        // Email confirmation is required
        setSignUpSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      setIsLoading(null);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSignUpSuccess(false);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-primary/5 via-white to-ocean-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-ocean-primary to-ocean-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Icon name="water" className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-ocean-deep mb-2">
            {isSignUp ? 'Create your account' : 'Welcome to Ocean PULSE'}
          </h1>
          <p className="text-gray-600">
            {isSignUp
              ? 'Sign up to save your favorite MPAs and submit observations'
              : 'Sign in to save your favorite MPAs and track ocean health'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!showEmailLogin ? (
            <>
              <div className="space-y-4">
                {/* Google Sign In */}
                <button
                  onClick={() => signInWithProvider('google')}
                  disabled={isLoading !== null}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading === 'google' ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-ocean-primary rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  <span className="font-medium text-gray-700">
                    Continue with Google
                  </span>
                </button>

                {/* Email Sign In Button */}
                <button
                  onClick={() => setShowEmailLogin(true)}
                  disabled={isLoading !== null}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="mail" className="text-gray-600" />
                  <span className="font-medium text-gray-700">
                    Continue with Email
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Email Form */}
              {signUpSuccess ? (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Icon name="check" className="text-green-600 text-2xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Check your email</h3>
                    <p className="text-sm text-gray-600">
                      We sent a confirmation link to <strong>{email}</strong>. Please check your inbox and click the link to activate your account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSignUpSuccess(false);
                      setIsSignUp(false);
                      setShowEmailLogin(false);
                    }}
                    className="text-sm text-ocean-primary hover:text-ocean-deep transition-colors font-medium"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={isSignUp ? signUpWithEmail : signInWithEmail} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'}
                      required
                      minLength={isSignUp ? 8 : undefined}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-primary focus:border-transparent"
                    />
                  </div>
                  {isSignUp && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        minLength={8}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-primary focus:border-transparent"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading !== null}
                    className="w-full px-4 py-3 bg-ocean-primary text-white rounded-xl hover:bg-ocean-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isLoading === 'email' ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      isSignUp ? 'Create Account' : 'Sign In'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailLogin(false)}
                    className="w-full text-center text-gray-500 hover:text-gray-700 transition-colors text-sm"
                  >
                    Back to other options
                  </button>
                </form>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Continue as Guest */}
          <button
            onClick={() => router.push('/ocean-pulse-app')}
            className="w-full text-center text-ocean-primary hover:text-ocean-deep transition-colors font-medium"
          >
            Continue as guest
          </button>
        </div>

        {/* Toggle Sign In / Sign Up */}
        <p className="text-center text-sm text-gray-600 mt-6">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button onClick={toggleMode} className="text-ocean-primary hover:underline font-medium">
                Sign in
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={toggleMode} className="text-ocean-primary hover:underline font-medium">
                Sign up
              </button>
            </>
          )}
        </p>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-4">
          By {isSignUp ? 'signing up' : 'signing in'}, you agree to our{' '}
          <Link href="/privacy" className="text-ocean-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-ocean-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-primary/5 via-white to-ocean-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-ocean-primary to-ocean-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Icon name="water" className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-ocean-deep mb-2">
            Welcome to Ocean PULSE
          </h1>
          <p className="text-gray-600">
            Sign in to save your favorite MPAs and track ocean health
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-4">
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
