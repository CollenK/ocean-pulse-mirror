'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components/Icon';
import { storeAuthRedirect } from '@/lib/auth-redirect';

export function UserMenu() {
  const { user, profile, isAuthenticated, loading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    router.push('/ocean-pulse-app');
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
    );
  }

  // Not authenticated - show support and login buttons
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="https://www.balean.org/projects/68bfe9252ee300914fd4542a"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium hover:bg-white/30 backdrop-blur-sm transition-colors"
        >
          <Icon name="hand-holding-heart" size="sm" />
          <span className="hidden sm:inline">Support</span>
        </a>
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

  // Authenticated - show user menu
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <div className="flex items-center gap-2">
      <a
        href="https://www.balean.org/projects/68bfe9252ee300914fd4542a"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium hover:bg-white/30 backdrop-blur-sm transition-colors"
      >
        <Icon name="hand-holding-heart" size="sm" />
        <span className="hidden sm:inline">Support</span>
      </a>
      <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                router.push('/ocean-pulse-app/saved');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon name="heart" className="text-gray-400" size="sm" />
              <span>Saved MPAs</span>
            </button>

            <button
              onClick={() => {
                router.push('/ocean-pulse-app/profile');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon name="user" className="text-gray-400" size="sm" />
              <span>Profile Settings</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <Icon name="sign-out-alt" className="text-red-400" size="sm" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
