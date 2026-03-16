/**
 * useNotifications Hook
 * Provides notifications data with periodic polling for unread count
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/notification-service';
import type { Notification } from '@/types/verification';

const POLL_INTERVAL_MS = 60_000;

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(userId: string | null | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId),
        getUnreadCount(userId),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const pollUnread = useCallback(async () => {
    if (!userId) return;
    try {
      const count = await getUnreadCount(userId);
      setUnreadCount(count);
    } catch {
      // Silent fail for polling
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Poll for unread count
  useEffect(() => {
    if (!userId) return;

    intervalRef.current = setInterval(pollUnread, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, pollUnread]);

  const markRead = useCallback(async (notificationId: string) => {
    if (!userId) return;
    await markAsRead(notificationId, userId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [userId]);

  const markAllReadHandler = useCallback(async () => {
    if (!userId) return;
    await markAllAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead: markAllReadHandler,
    refetch: fetchAll,
  };
}
