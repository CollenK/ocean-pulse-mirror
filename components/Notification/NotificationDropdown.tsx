'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/types/verification';

interface NotificationDropdownProps {
  notifications: Notification[];
  loading: boolean;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onClose: () => void;
}

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'new_verification': return 'fi-rr-check-circle';
    case 'tier_upgrade': return 'fi-rr-diploma';
    default: return 'fi-rr-bell';
  }
}

export function NotificationDropdown({
  notifications,
  loading,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationDropdownProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await onMarkRead(notification.id);
    }
    const observationId = (notification.data as Record<string, unknown>)?.observation_id as string | undefined;
    if (observationId) {
      router.push(`/ocean-pulse-app/verify`);
    }
    onClose();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
        {notifications.some(n => !n.read) && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-balean-cyan hover:text-balean-cyan/80 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-72">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <i className="fi fi-rr-bell text-2xl text-gray-300 block mb-2" />
            <p className="text-sm text-gray-400">No notifications</p>
          </div>
        ) : (
          notifications.map(notification => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                !notification.read ? 'bg-blue-50/50' : ''
              }`}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${notification.type === 'tier_upgrade' ? 'bg-green-100' : 'bg-blue-100'}
              `}>
                <i className={`fi ${getNotificationIcon(notification.type)} text-sm ${
                  notification.type === 'tier_upgrade' ? 'text-green-600' : 'text-blue-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </p>
                {notification.body && (
                  <p className="text-xs text-gray-500 truncate">{notification.body}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatTimeAgo(notification.created_at)}
                </p>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-balean-cyan flex-shrink-0 mt-1.5" />
              )}
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}
