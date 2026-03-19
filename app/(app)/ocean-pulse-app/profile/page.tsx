'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSavedMPAs } from '@/hooks/useSavedMPAs';
import { Card, CardContent, Icon } from '@/components/ui';
import { storeAuthRedirect } from '@/lib/auth-redirect';
import { getUserObservationStats, type UserObservationStats } from '@/lib/observations-service';
import { getUserVerificationStats } from '@/lib/verification-service';
import type { VerificationStats } from '@/types/verification';
import { useGamification } from '@/hooks/useGamification';
import { isDemoUser as checkIsDemoUser } from '@/lib/demo/demo-config';
import { ProfileHeader } from './ProfileHeader';
import { ProfileActivityStats } from './ProfileActivityStats';
import { ProfileGamification } from './ProfileGamification';
import { ProfileImpact } from './ProfileImpact';
import { ProfileSettings } from './ProfileSettings';

function DemoAccountNotice() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="shadow-lg border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Icon name="info" className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800 mb-1">Shared demo account</p>
              <p className="text-sm text-amber-700">
                This is a shared demo account. Profile settings and account actions are disabled.
                To customize your profile and save your own observations, create a personal account.
              </p>
              <Link href="/login?signup=true" className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700">
                Create your own account <Icon name="arrow-right" size="sm" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ProfileLoadingSkeleton() {
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

async function downloadExport() {
  const response = await fetch('/api/gdpr/export');
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ocean-pulse-data-export.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getInitialDisplayName(profile: { display_name?: string | null } | null, email?: string): string {
  if (profile?.display_name) return profile.display_name;
  if (email) return email.split('@')[0];
  return '';
}

function getAvatarUrl(profile: { avatar_url?: string | null } | null, userMetadata?: { avatar_url?: string }): string | undefined {
  return profile?.avatar_url || userMetadata?.avatar_url || undefined;
}

function getResolvedDisplayName(profile: { display_name?: string | null } | null, email?: string): string {
  return profile?.display_name || email?.split('@')[0] || 'User';
}

function ProfilePageContent({ user, profile, updateProfile, signOut: doSignOut }: { user: NonNullable<ReturnType<typeof useAuth>['user']>; profile: ReturnType<typeof useAuth>['profile']; updateProfile: ReturnType<typeof useAuth>['updateProfile']; signOut: ReturnType<typeof useAuth>['signOut'] }) {
  const router = useRouter();
  const { savedMPAIds } = useSavedMPAs();
  const [displayName, setDisplayName] = useState(() => getInitialDisplayName(profile, user.email));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userStats, setUserStats] = useState<UserObservationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [verificationStats, setVerificationStats] = useState<VerificationStats | null>(null);
  const { stats: gamStats, speciesCollection, loading: gamLoading } = useGamification(user.id);
  const isDemoAccount = checkIsDemoUser(user.id, user.email);

  useEffect(() => {
    setDisplayName(getInitialDisplayName(profile, user.email));
  }, [profile, user.email]);

  useEffect(() => {
    setStatsLoading(true);
    Promise.all([getUserObservationStats(user.id), getUserVerificationStats(user.id)])
      .then(([obsStats, vStats]) => { setUserStats(obsStats); setVerificationStats(vStats); })
      .finally(() => setStatsLoading(false));
  }, [user.id]);

  const handleSave = async () => {
    setSaving(true); setMessage(null);
    const { error } = await updateProfile({ display_name: displayName });
    setMessage(error ? { type: 'error', text: 'Failed to update profile. Please try again.' } : { type: 'success', text: 'Profile updated successfully!' });
    setSaving(false);
  };

  const handleSignOut = async () => { await doSignOut(); router.push('/ocean-pulse-app'); };

  const handleExportData = async () => {
    setExporting(true);
    try { await downloadExport(); } catch { setMessage({ type: 'error', text: 'Failed to export data. Please try again.' }); } finally { setExporting(false); }
  };

  const avatarUrl = getAvatarUrl(profile, user.user_metadata);
  const currentDisplayName = getResolvedDisplayName(profile, user.email);

  return (
    <main className="min-h-screen pb-32">
      <ProfileHeader avatarUrl={avatarUrl} displayName={currentDisplayName} email={user.email} gamStats={gamStats} />
      <div className="max-w-screen-xl mx-auto px-6 -mt-10 space-y-6">
        <ProfileActivityStats savedMPACount={savedMPAIds.length} statsLoading={statsLoading} userStats={userStats} />
        <ProfileGamification gamLoading={gamLoading} gamStats={gamStats} speciesCollection={speciesCollection} userId={user.id} />
        <ProfileImpact statsLoading={statsLoading} userStats={userStats} verificationStats={verificationStats} />
        {isDemoAccount && <DemoAccountNotice />}
        <ProfileSettings user={user} displayName={displayName} onDisplayNameChange={setDisplayName} profileDisplayName={profile?.display_name} saving={saving} onSave={handleSave} message={message} savedMPACount={savedMPAIds.length} isDemoAccount={isDemoAccount} onExportData={handleExportData} exporting={exporting} onSignOut={handleSignOut} />
        <div className="text-center text-balean-gray-400 py-4"><p className="text-sm">Ocean PULSE v1.0.0</p></div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading, updateProfile, signOut } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      storeAuthRedirect('/ocean-pulse-app/profile');
      router.push('/login?redirect=/ocean-pulse-app/profile');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) return <ProfileLoadingSkeleton />;
  if (!isAuthenticated || !user) return null;

  return <ProfilePageContent user={user} profile={profile} updateProfile={updateProfile} signOut={signOut} />;
}
