'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardTitle, Badge, Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { QualityTierBadge } from '@/components/ui/QualityTierBadge';
import { storeAuthRedirect } from '@/lib/auth-redirect';
import type { AdminStats, AdminUser, RecentObservation, RecentVerification } from '@/lib/admin-service';
import { fetchAdminStats, fetchAdminUsers, fetchRecentObservations, fetchRecentVerifications, toggleUserRole } from '@/lib/admin-service';
import type { QualityTier } from '@/types/verification';

type Tab = 'overview' | 'users' | 'observations' | 'verifications';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [recentObs, setRecentObs] = useState<RecentObservation[]>([]);
  const [recentVerifs, setRecentVerifs] = useState<RecentVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      storeAuthRedirect('/ocean-pulse-app/admin');
      router.push('/login?redirect=/ocean-pulse-app/admin');
    }
  }, [authLoading, isAuthenticated, router]);

  // Admin guard
  useEffect(() => {
    if (!authLoading && profile && !profile.is_admin) {
      router.push('/ocean-pulse-app');
    }
  }, [authLoading, profile, router]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const [statsData, usersData, obsData, verifsData] = await Promise.all([
      fetchAdminStats(),
      fetchAdminUsers(),
      fetchRecentObservations(),
      fetchRecentVerifications(),
    ]);
    setStats(statsData);
    setUsers(usersData);
    setRecentObs(obsData);
    setRecentVerifs(verifsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile?.is_admin) {
      loadData();
    }
  }, [profile?.is_admin, loadData]);

  const handleToggleRole = async (userId: string, role: 'is_expert' | 'is_admin', currentValue: boolean) => {
    setTogglingRole(`${userId}-${role}`);
    const success = await toggleUserRole(userId, role, !currentValue);
    if (success) {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, [role]: !currentValue } : u
      ));
    }
    setTogglingRole(null);
  };

  if (authLoading || (isAuthenticated && !profile)) {
    return (
      <main className="min-h-screen pb-32">
        <div className="bg-gradient-to-br from-balean-navy via-balean-navy to-gray-900 pt-4 pb-16 px-6">
          <div className="max-w-screen-xl mx-auto">
            <div className="h-8 w-48 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !profile?.is_admin) return null;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'fi-rr-chart-pie' },
    { id: 'users', label: 'Users', icon: 'fi-rr-users' },
    { id: 'observations', label: 'Observations', icon: 'fi-rr-camera' },
    { id: 'verifications', label: 'Verifications', icon: 'fi-rr-check-circle' },
  ];

  return (
    <main className="min-h-screen pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-balean-navy via-balean-navy to-gray-900 pt-4 pb-16 px-6">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <i className="fi fi-rr-shield-check text-balean-cyan text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-white/50 text-sm">Manage Ocean PULSE</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 -mt-10 space-y-6">
        {/* Tab navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? 'bg-white text-balean-navy shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                }
              `}
            >
              <i className={`fi ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 bg-gray-100 rounded-xl" />
                  <div className="h-20 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'overview' && stats && <OverviewTab stats={stats} />}
            {activeTab === 'users' && (
              <UsersTab
                users={users}
                togglingRole={togglingRole}
                onToggleRole={handleToggleRole}
              />
            )}
            {activeTab === 'observations' && <ObservationsTab observations={recentObs} stats={stats} />}
            {activeTab === 'verifications' && <VerificationsTab verifications={recentVerifs} stats={stats} />}
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}) {
  return (
    <div className={`p-4 bg-gradient-to-br ${color} rounded-xl`}>
      <div className="flex items-center gap-2 mb-2">
        <i className={`fi ${icon} text-sm opacity-60`} />
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function OverviewTab({ stats }: { stats: AdminStats }) {
  const tierTotal = stats.tier_casual + stats.tier_needs_id + stats.tier_verified + stats.tier_research_grade;
  const tierPercent = (count: number) => tierTotal > 0 ? Math.round((count / tierTotal) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Key metrics */}
      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2">
          <i className="fi fi-rr-chart-pie text-balean-cyan" />
          Key Metrics
        </CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Users" value={stats.total_users} icon="fi-rr-users" color="from-blue-50 to-cyan-50 text-blue-900" />
            <StatCard label="Experts" value={stats.expert_count} icon="fi-rr-diploma" color="from-amber-50 to-orange-50 text-amber-900" />
            <StatCard label="Observations" value={stats.total_observations} icon="fi-rr-camera" color="from-green-50 to-emerald-50 text-green-900" />
            <StatCard label="Verifications" value={stats.total_verifications} icon="fi-rr-check-circle" color="from-purple-50 to-violet-50 text-purple-900" />
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2">
          <i className="fi fi-rr-time-past text-balean-cyan" />
          Recent Activity
        </CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Observations (7d)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.observations_last_7d}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Observations (30d)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.observations_last_30d}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Verifications (7d)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.verifications_last_7d}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Unread Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unread_notifications}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Quality */}
      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2">
          <i className="fi fi-rr-signal-alt text-balean-cyan" />
          Data Quality Distribution
        </CardTitle>
        <CardContent>
          <div className="space-y-3">
            <TierBar label="Casual" count={stats.tier_casual} percent={tierPercent(stats.tier_casual)} color="bg-gray-400" />
            <TierBar label="Unverified" count={stats.tier_needs_id} percent={tierPercent(stats.tier_needs_id)} color="bg-amber-400" />
            <TierBar label="Verified" count={stats.tier_verified} percent={tierPercent(stats.tier_verified)} color="bg-blue-500" />
            <TierBar label="Research Grade" count={stats.tier_research_grade} percent={tierPercent(stats.tier_research_grade)} color="bg-green-500" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total observations</span>
            <span className="text-sm font-semibold text-gray-900">{tierTotal}</span>
          </div>
        </CardContent>
      </Card>

      {/* Platform health */}
      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2">
          <i className="fi fi-rr-database text-balean-cyan" />
          Platform Summary
        </CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-lg font-bold text-gray-900">{stats.total_mpas}</p>
              <p className="text-xs text-gray-500">MPAs Loaded</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-lg font-bold text-gray-900">{stats.total_saved_mpas}</p>
              <p className="text-xs text-gray-500">Saved MPAs</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-lg font-bold text-gray-900">{stats.admin_count}</p>
              <p className="text-xs text-gray-500">Admins</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TierBar({ label, count, percent, color }: {
  label: string; count: number; percent: number; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{count} ({percent}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function UsersTab({ users, togglingRole, onToggleRole }: {
  users: AdminUser[];
  togglingRole: string | null;
  onToggleRole: (userId: string, role: 'is_expert' | 'is_admin', currentValue: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2">
          <i className="fi fi-rr-users text-balean-cyan" />
          All Users ({users.length})
        </CardTitle>
        <CardContent>
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-balean-cyan/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-balean-cyan">
                      {(u.display_name || u.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {u.display_name || u.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {u.observation_count} obs
                    </span>
                    <span className="text-[10px] text-gray-300">|</span>
                    <span className="text-[10px] text-gray-400">
                      {u.verification_count} verif
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onToggleRole(u.id, 'is_expert', u.is_expert)}
                    disabled={togglingRole === `${u.id}-is_expert`}
                    className={`
                      px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                      ${u.is_expert
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }
                    `}
                    title={u.is_expert ? 'Remove expert role' : 'Grant expert role'}
                  >
                    {togglingRole === `${u.id}-is_expert` ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <i className="fi fi-rr-diploma mr-1" />
                        Expert
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onToggleRole(u.id, 'is_admin', u.is_admin)}
                    disabled={togglingRole === `${u.id}-is_admin`}
                    className={`
                      px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                      ${u.is_admin
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }
                    `}
                    title={u.is_admin ? 'Remove admin role' : 'Grant admin role'}
                  >
                    {togglingRole === `${u.id}-is_admin` ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <i className="fi fi-rr-shield-check mr-1" />
                        Admin
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No users found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ObservationsTab({ observations, stats }: {
  observations: RecentObservation[];
  stats: AdminStats | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total_observations} icon="fi-rr-camera" color="from-blue-50 to-cyan-50 text-blue-900" />
          <StatCard label="Last 7 days" value={stats.observations_last_7d} icon="fi-rr-calendar" color="from-green-50 to-emerald-50 text-green-900" />
          <StatCard label="Last 30 days" value={stats.observations_last_30d} icon="fi-rr-calendar" color="from-amber-50 to-orange-50 text-amber-900" />
          <StatCard label="Research Grade" value={stats.tier_research_grade} icon="fi-rr-diploma" color="from-purple-50 to-violet-50 text-purple-900" />
        </div>
      )}

      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2">
          <i className="fi fi-rr-time-past text-balean-cyan" />
          Recent Observations
        </CardTitle>
        <CardContent>
          <div className="space-y-3">
            {observations.map(obs => (
              <div key={obs.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {obs.photo_url ? (
                  <img src={obs.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    <i className="fi fi-rr-camera text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {obs.species_name || 'Unknown species'}
                  </p>
                  <p className="text-xs text-gray-400">
                    by {obs.profiles?.display_name || 'Anonymous'} · {formatTimeAgo(obs.created_at)}
                  </p>
                </div>
                <QualityTierBadge tier={obs.quality_tier as QualityTier} size="sm" />
              </div>
            ))}
            {observations.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No observations yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function VerificationsTab({ verifications, stats }: {
  verifications: RecentVerification[];
  stats: AdminStats | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Verifications" value={stats.total_verifications} icon="fi-rr-check-circle" color="from-blue-50 to-cyan-50 text-blue-900" />
          <StatCard label="Last 7 days" value={stats.verifications_last_7d} icon="fi-rr-calendar" color="from-green-50 to-emerald-50 text-green-900" />
        </div>
      )}

      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2">
          <i className="fi fi-rr-time-past text-balean-cyan" />
          Recent Verifications
        </CardTitle>
        <CardContent>
          <div className="space-y-3">
            {verifications.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  v.is_agreement ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  <i className={`fi ${v.is_agreement ? 'fi-rr-check text-green-600' : 'fi-rr-exchange text-amber-600'} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{v.profiles?.display_name || 'User'}</span>
                    {' '}
                    {v.is_agreement ? 'agreed with' : 'suggested'}
                    {' '}
                    <span className="italic">{v.is_agreement ? v.observations?.species_name : v.species_name}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Confidence: {v.confidence}/5 · {formatTimeAgo(v.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {verifications.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No verifications yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
