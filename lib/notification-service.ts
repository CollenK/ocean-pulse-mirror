/**
 * Notification Service
 * Handles notification CRUD operations
 */

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Notification } from '@/types/verification';

/**
 * Get notifications for a user, ordered by most recent
 */
export async function getNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }

  return (data || []) as Notification[];
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createClient();

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createClient();

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}
