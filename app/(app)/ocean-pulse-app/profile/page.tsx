'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSavedMPAs } from '@/hooks/useSavedMPAs';
import { Card, CardContent, CardTitle, Button, Badge, Icon } from '@/components/ui';
import { storeAuthRedirect } from '@/lib/auth-redirect';
import { openCookiePreferences } from '@/components/CookieConsent';
import { getUserObservationStats, type UserObservationStats } from '@/lib/observations-service';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading, updateProfile, signOut } = useAuth();
  const { savedMPAIds } = useSavedMPAs();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userStats, setUserStats] = useState<UserObservationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      storeAuthRedirect('/ocean-pulse-app/profile');
      router.push('/login?redirect=/ocean-pulse-app/profile');
    }
  }, [authLoading, isAuthenticated, router]);

  // Initialize form with profile data
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    } else if (user?.email) {
      setDisplayName(user.email.split('@')[0]);
    }
  }, [profile, user]);

  // Fetch user observation stats
  useEffect(() => {
    if (user?.id) {
      setStatsLoading(true);
      getUserObservationStats(user.id)
        .then(setUserStats)
        .finally(() => setStatsLoading(false));
    } else {
      setStatsLoading(false);
    }
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const { error } = await updateProfile({ display_name: displayName });

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    }

    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/ocean-pulse-app');
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <main className="min-h-screen pb-32">
        <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-balean-coral pt-4 pb-16 px-6">
          <div className="max-w-screen-xl mx-auto">
            <div className="h-8 w-48 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const currentDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <main className="min-h-screen pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-balean-coral pt-4 pb-16 px-6">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={currentDisplayName}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                <span className="text-white text-3xl font-medium">
                  {currentDisplayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{currentDisplayName}</h1>
              <p className="text-white/80">{user?.email}</p>
              <Badge variant="info" size="sm" className="mt-2 bg-white/20 text-white border-none">
                Marine Observer
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 -mt-10 space-y-6">
        {/* Activity Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-lg">
            <CardTitle className="flex items-center gap-2">
              <Icon name="chart-line" className="text-balean-cyan" />
              Activity Stats
            </CardTitle>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl">
                  <p className="text-3xl font-bold text-red-500">{savedMPAIds.length}</p>
                  <p className="text-sm text-balean-gray-500">Saved MPAs</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                  {statsLoading ? (
                    <div className="h-9 flex items-center justify-center">
                      <div className="animate-pulse bg-balean-gray-200 rounded w-8 h-8" />
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-balean-cyan">{userStats?.observationCount ?? 0}</p>
                  )}
                  <p className="text-sm text-balean-gray-500">Observations</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                  {statsLoading ? (
                    <div className="h-9 flex items-center justify-center">
                      <div className="animate-pulse bg-balean-gray-200 rounded w-8 h-8" />
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-green-500">{userStats?.speciesCount ?? 0}</p>
                  )}
                  <p className="text-sm text-balean-gray-500">Species Found</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Impact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg">
            <CardTitle className="flex items-center gap-2">
              <Icon name="heart-rate" className="text-amber-600" />
              Your Impact
            </CardTitle>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-balean-cyan border-t-transparent" />
                </div>
              ) : userStats && userStats.healthAssessmentCount > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-balean-gray-600">
                    You have contributed {userStats.healthAssessmentCount} health assessment{userStats.healthAssessmentCount !== 1 ? 's' : ''} across {userStats.mpasContributed} MPA{userStats.mpasContributed !== 1 ? 's' : ''}.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-amber-600">{userStats.healthAssessmentCount}</p>
                      <p className="text-xs text-balean-gray-500">Assessments</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-amber-600">{userStats.averageHealthScore ?? '-'}</p>
                      <p className="text-xs text-balean-gray-500">Avg. Score</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 mx-auto mb-3 flex items-center justify-center">
                    <Icon name="star" className="text-amber-400 text-xl" />
                  </div>
                  <p className="text-sm text-balean-gray-500 mb-1">No health assessments yet</p>
                  <p className="text-xs text-balean-gray-400">
                    Start contributing by submitting observations with health assessments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardTitle className="flex items-center gap-2">
              <Icon name="user" className="text-balean-cyan" />
              Profile Settings
            </CardTitle>
            <CardContent>
              {message && (
                <div
                  className={`mb-4 p-3 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-balean-gray-600 mb-1">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 border border-balean-gray-300 rounded-lg focus:ring-2 focus:ring-balean-cyan focus:border-balean-cyan outline-none transition-colors"
                    placeholder="Enter your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-balean-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-balean-gray-200 rounded-lg bg-balean-gray-50 text-balean-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-balean-gray-400 mt-1">Email cannot be changed</p>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving || displayName === (profile?.display_name || user?.email?.split('@')[0])}
                  className="mt-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size="sm" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-lg">
            <CardTitle className="flex items-center gap-2">
              <Icon name="shield-check" className="text-balean-cyan" />
              Account
            </CardTitle>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-balean-gray-100">
                  <div>
                    <p className="font-medium text-balean-navy">Sign-in Method</p>
                    <p className="text-sm text-balean-gray-400">Google Account</p>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <Icon name="check-circle" size="sm" />
                    <span className="text-sm">Connected</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-balean-gray-100">
                  <div>
                    <p className="font-medium text-balean-navy">Member Since</p>
                    <p className="text-sm text-balean-gray-400">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-balean-navy">Last Sign In</p>
                    <p className="text-sm text-balean-gray-400">
                      {user?.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* App Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg">
            <CardTitle className="flex items-center gap-2">
              <Icon name="settings" className="text-balean-cyan" />
              Settings
            </CardTitle>
            <CardContent>
              <div className="space-y-1">
                <Link
                  href="/ocean-pulse-app/offline"
                  className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-balean-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="download" className="text-balean-gray-300" />
                    <div>
                      <span className="font-medium text-balean-navy">Offline Data</span>
                      <span className="text-balean-gray-400 text-sm block">Manage cached MPAs</span>
                    </div>
                  </div>
                  <Icon name="angle-right" className="text-balean-gray-300" />
                </Link>
                <Link
                  href="/ocean-pulse-app/saved"
                  className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-balean-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="heart" className="text-balean-gray-300" />
                    <div>
                      <span className="font-medium text-balean-navy">Saved MPAs</span>
                      <span className="text-balean-gray-400 text-sm block">{savedMPAIds.length} saved</span>
                    </div>
                  </div>
                  <Icon name="angle-right" className="text-balean-gray-300" />
                </Link>
                <button
                  onClick={() => openCookiePreferences()}
                  className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-balean-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="lock" className="text-balean-gray-300" />
                    <div className="text-left">
                      <span className="font-medium text-balean-navy">Cookie Preferences</span>
                      <span className="text-balean-gray-400 text-sm block">Manage cookie settings</span>
                    </div>
                  </div>
                  <Icon name="angle-right" className="text-balean-gray-300" />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg border-red-100">
            <CardContent className="pt-6">
              <Button
                onClick={handleSignOut}
                variant="secondary"
                fullWidth
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Icon name="sign-out-alt" size="sm" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Version */}
        <div className="text-center text-balean-gray-400 py-4">
          <p className="text-sm">Ocean PULSE v1.0.0</p>
        </div>
      </div>
    </main>
  );
}
