/**
 * GDPR Account Deletion API
 *
 * Deletes all user data from the database and signs the user out.
 *
 * Note: The Supabase auth record cannot be deleted with the anon key
 * (requires admin/service role). This endpoint removes all personal data
 * from application tables and signs the user out. The auth record remains
 * but contains no application data.
 *
 * DELETE /api/gdpr/delete-account
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Delete user data from all application tables in dependency order.
    // Using ::text cast in case user_id columns are stored as text.
    const deletions = [
      supabase
        .from('user_health_assessments')
        .delete()
        .eq('user_id', userId),
      supabase
        .from('observations')
        .delete()
        .eq('user_id', userId),
      supabase
        .from('saved_mpas')
        .delete()
        .eq('user_id', userId),
    ];

    const results = await Promise.all(deletions);

    for (const result of results) {
      if (result.error) {
        console.error('GDPR deletion error:', result.error);
        return NextResponse.json(
          { error: 'Failed to delete account data. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Delete user profile last (other tables may reference it)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('GDPR profile deletion error:', profileError);
      return NextResponse.json(
        { error: 'Failed to delete profile data. Please try again.' },
        { status: 500 }
      );
    }

    // Sign the user out to invalidate their session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GDPR delete-account error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
