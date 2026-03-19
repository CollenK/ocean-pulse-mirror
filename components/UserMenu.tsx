'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components/Icon';
import { storeAuthRedirect } from '@/lib/auth-redirect';
import { getLatestChangeDate } from '@/lib/whats-new-data';

const LAST_VIEWED_KEY = 'ocean-pulse-whats-new-last-viewed';

function hasUnviewedChanges(): boolean {
  try {
    const lastViewed = localStorage.getItem(LAST_VIEWED_KEY);
    if (!lastViewed) return true;
    return lastViewed < getLatestChangeDate();
  } catch {
    return false;
  }
}

function SupportLink() {
  return (
    <a
      href="https://www.balean.org/projects/68bfe9252ee300914fd4542a"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium hover:bg-white/30 backdrop-blur-sm transition-colors"
    >
      <Icon name="hand-holding-heart" size="sm" />
      <span className="hidden sm:inline">Support</span>
    </a>
  );
}

interface MenuItemProps {
  onClick: () => void;
  icon: string;
  iconClassName?: string;
  label: string;
  className?: string;
}

function MenuItem({ onClick, icon, iconClassName = 'text-gray-400', label, className = 'text-gray-700 hover:bg-gray-50' }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${className}`}
    >
      <Icon name={icon} className={iconClassName} size="sm" />
      <span>{label}</span>
    </button>
  );
}

interface UnauthenticatedMenuProps {
  pathname: string;
}

function UnauthenticatedMenu({ pathname }: UnauthenticatedMenuProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <SupportLink />
      <button
        onClick={() => {
          storeAuthRedirect(pathname);
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-ocean-primary text-white rounded-full text-sm font-medium hover:bg-ocean-primary/90 transition-colors"
      >
        <Icon name="sign-in-alt" size="sm" />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    </div>
  );
}

export function UserMenu() {
  const { user, profile, isAuthenticated, isDemoUser, loading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewDot, setShowNewDot] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setShowNewDot(hasUnviewedChanges());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    router.push('/ocean-pulse-app');
  };

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!isAuthenticated) {
    return <UnauthenticatedMenu pathname={pathname} />;
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <div className="flex items-center gap-2">
      <SupportLink />
      <div className="relative" ref={menuRef}>
        <UserMenuTrigger
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          avatarUrl={avatarUrl}
          displayName={displayName}
        />
        {isOpen && (
          <UserMenuDropdown
            displayName={displayName}
            email={user?.email}
            isDemoUser={isDemoUser}
            isAdmin={!!profile?.is_admin}
            showNewDot={showNewDot}
            onNavigate={navigateTo}
            onWhatsNew={() => { navigateTo('/ocean-pulse-app/whats-new'); setShowNewDot(false); }}
            onSignOut={handleSignOut}
          />
        )}
      </div>
    </div>
  );
}

interface UserMenuTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  avatarUrl: string | undefined;
  displayName: string;
}

function UserMenuTrigger({ isOpen, onToggle, avatarUrl, displayName }: UserMenuTriggerProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 p-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-9 h-9 rounded-full object-cover border-2 border-white/50"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
          <span className="text-ocean-primary text-sm font-medium">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <Icon
        name="angle-down"
        className={`text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
        size="sm"
      />
    </button>
  );
}

interface UserMenuDropdownProps {
  displayName: string;
  email: string | undefined;
  isDemoUser: boolean;
  isAdmin: boolean;
  showNewDot: boolean;
  onNavigate: (path: string) => void;
  onWhatsNew: () => void;
  onSignOut: () => void;
}

function UserMenuDropdown({ displayName, email, isDemoUser, isAdmin, showNewDot, onNavigate, onWhatsNew, onSignOut }: UserMenuDropdownProps) {
  return (
    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{displayName}</p>
          {isDemoUser && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
              DEMO
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{email}</p>
      </div>

      <div className="py-2">
        <MenuItem onClick={() => onNavigate('/ocean-pulse-app/saved')} icon="heart" label="Saved MPAs" />
        <MenuItem onClick={() => onNavigate('/ocean-pulse-app/profile')} icon="user" label="Profile Settings" />
        {isAdmin && (
          <MenuItem onClick={() => onNavigate('/ocean-pulse-app/admin')} icon="shield-check" label="Admin Dashboard" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-2">
        <button
          onClick={onWhatsNew}
          className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="relative">
            <Icon name="sparkles" className="text-gray-400" size="sm" />
            {showNewDot && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </span>
          <span>What's New</span>
          {showNewDot && (
            <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              NEW
            </span>
          )}
        </button>

        {isDemoUser && (
          <MenuItem onClick={() => onNavigate('/login?signup=true')} icon="user-add" iconClassName="text-teal-500" label="Create Account" className="text-teal-600 hover:bg-teal-50" />
        )}

        <MenuItem onClick={onSignOut} icon="sign-out-alt" iconClassName="text-red-400" label={isDemoUser ? 'Exit Demo' : 'Sign out'} className="text-red-600 hover:bg-red-50" />
      </div>
    </div>
  );
}
