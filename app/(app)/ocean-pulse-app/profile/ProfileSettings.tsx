'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardTitle, CardContent, Button, Icon } from '@/components/ui';
import { openCookiePreferences } from '@/components/CookieConsent';
import type { User } from '@supabase/supabase-js';

interface ProfileSettingsProps {
  user: User;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  profileDisplayName: string | null | undefined;
  saving: boolean;
  onSave: () => void;
  message: { type: 'success' | 'error'; text: string } | null;
  savedMPACount: number;
  isDemoAccount: boolean;
  onExportData: () => void;
  exporting: boolean;
  onSignOut: () => void;
}

function AccountInfoCard({ user }: { user: User }) {
  const formatDate = (dateStr: string | undefined, includeTime = false) => {
    if (!dateStr) return 'Unknown';
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    if (includeTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
    return new Date(dateStr).toLocaleDateString('en-US', opts);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2"><Icon name="shield-check" className="text-balean-cyan" />Account</CardTitle>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-balean-gray-100">
              <div><p className="font-medium text-balean-navy">Sign-in Method</p><p className="text-sm text-balean-gray-400">Google Account</p></div>
              <div className="flex items-center gap-2 text-green-600"><Icon name="check-circle" size="sm" /><span className="text-sm">Connected</span></div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-balean-gray-100">
              <div><p className="font-medium text-balean-navy">Member Since</p><p className="text-sm text-balean-gray-400">{formatDate(user.created_at)}</p></div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div><p className="font-medium text-balean-navy">Last Sign In</p><p className="text-sm text-balean-gray-400">{formatDate(user.last_sign_in_at, true)}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AppSettingsCard({ savedMPACount }: { savedMPACount: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2"><Icon name="settings" className="text-balean-cyan" />Settings</CardTitle>
        <CardContent>
          <div className="space-y-1">
            <Link href="/ocean-pulse-app/offline" className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-balean-gray-50 transition-colors">
              <div className="flex items-center gap-3"><Icon name="download" className="text-balean-gray-300" /><div><span className="font-medium text-balean-navy">Offline Data</span><span className="text-balean-gray-400 text-sm block">Manage cached MPAs</span></div></div>
              <Icon name="angle-right" className="text-balean-gray-300" />
            </Link>
            <Link href="/ocean-pulse-app/saved" className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-balean-gray-50 transition-colors">
              <div className="flex items-center gap-3"><Icon name="heart" className="text-balean-gray-300" /><div><span className="font-medium text-balean-navy">Saved MPAs</span><span className="text-balean-gray-400 text-sm block">{savedMPACount} saved</span></div></div>
              <Icon name="angle-right" className="text-balean-gray-300" />
            </Link>
            <button onClick={() => openCookiePreferences()} className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-balean-gray-50 transition-colors">
              <div className="flex items-center gap-3"><Icon name="lock" className="text-balean-gray-300" /><div className="text-left"><span className="font-medium text-balean-navy">Cookie Preferences</span><span className="text-balean-gray-400 text-sm block">Manage cookie settings</span></div></div>
              <Icon name="angle-right" className="text-balean-gray-300" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DeleteAccountModal({ onClose, onDelete, deleting, deleteMessage }: { onClose: () => void; onDelete: () => void; deleting: boolean; deleteMessage: { type: 'error'; text: string } | null }) {
  const [confirmText, setConfirmText] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><Icon name="exclamation" className="text-red-500" /></div>
          <h3 className="text-lg font-bold text-balean-navy">Delete Account</h3>
        </div>
        <p className="text-sm text-balean-gray-500 mb-2">This action is permanent and cannot be undone. All your observations, saved MPAs, health assessments, and profile data will be deleted.</p>
        <p className="text-sm font-medium text-balean-navy mb-2">Type <span className="font-mono text-red-500 bg-red-50 px-1.5 py-0.5 rounded">DELETE</span> to confirm:</p>
        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE to confirm" className="w-full px-4 py-2 border border-balean-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-colors mb-4 font-mono" autoFocus />
        {deleteMessage && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{deleteMessage.text}</div>}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="secondary" size="sm" className="flex-1" disabled={deleting}>Cancel</Button>
          <Button onClick={() => { if (confirmText === 'DELETE') onDelete(); }} variant="danger" size="sm" className="flex-1" disabled={confirmText !== 'DELETE' || deleting} loading={deleting}>Delete My Account</Button>
        </div>
      </motion.div>
    </div>
  );
}

export function ProfileSettings({
  user, displayName, onDisplayNameChange, profileDisplayName,
  saving, onSave, message, savedMPACount, isDemoAccount,
  onExportData, exporting, onSignOut,
}: ProfileSettingsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'error'; text: string } | null>(null);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/gdpr/delete-account', { method: 'DELETE' });
      if (!response.ok) throw new Error('Deletion failed');
      window.location.href = '/';
    } catch {
      setDeleteMessage({ type: 'error', text: 'Failed to delete account. Please try again.' });
      setDeleting(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className={`shadow-lg ${isDemoAccount ? 'opacity-60 pointer-events-none' : ''}`}>
          <CardTitle className="flex items-center gap-2"><Icon name="user" className="text-balean-cyan" />Profile Settings</CardTitle>
          <CardContent>
            {message && <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>}
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-balean-gray-600 mb-1">Display Name</label>
                <input id="displayName" type="text" value={displayName} onChange={(e) => onDisplayNameChange(e.target.value)} disabled={isDemoAccount} className="w-full px-4 py-2 border border-balean-gray-300 rounded-lg focus:ring-2 focus:ring-balean-cyan focus:border-balean-cyan outline-none transition-colors disabled:bg-balean-gray-50 disabled:cursor-not-allowed" placeholder="Enter your display name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-balean-gray-600 mb-1">Email</label>
                <input type="email" value={user.email || ''} disabled className="w-full px-4 py-2 border border-balean-gray-200 rounded-lg bg-balean-gray-50 text-balean-gray-400 cursor-not-allowed" />
                <p className="text-xs text-balean-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <Button onClick={onSave} disabled={isDemoAccount || saving || displayName === (profileDisplayName || user.email?.split('@')[0])} className="mt-2">
                {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>) : (<><Icon name="check" size="sm" />Save Changes</>)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AccountInfoCard user={user} />
      <AppSettingsCard savedMPACount={savedMPACount} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className={`shadow-lg ${isDemoAccount ? 'opacity-60 pointer-events-none' : ''}`}>
          <CardTitle className="flex items-center gap-2"><Icon name="document" className="text-balean-cyan" />Data &amp; Privacy</CardTitle>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-balean-gray-100">
                <div><p className="font-medium text-balean-navy">Download My Data</p><p className="text-sm text-balean-gray-400">Export all your data as a JSON file</p></div>
                <Button onClick={onExportData} variant="outline" size="sm" loading={exporting} disabled={exporting}><Icon name="download" size="sm" />Export</Button>
              </div>
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-balean-navy">Delete Account</p><p className="text-sm text-balean-gray-400">Permanently remove all your data</p></div>
                  <Button onClick={() => setShowDeleteConfirm(true)} variant="danger" size="sm"><Icon name="trash" size="sm" />Delete</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {showDeleteConfirm && <DeleteAccountModal onClose={() => setShowDeleteConfirm(false)} onDelete={handleDeleteAccount} deleting={deleting} deleteMessage={deleteMessage} />}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="shadow-lg border-red-100">
          <CardContent className="pt-6">
            <Button onClick={onSignOut} variant="secondary" fullWidth className="border-red-200 text-red-600 hover:bg-red-50"><Icon name="sign-out-alt" size="sm" />Sign Out</Button>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
