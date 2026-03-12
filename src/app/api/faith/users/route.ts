import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  raw_app_meta_data: Record<string, any> | null;
}

interface UserWithProfile extends AuthUser {
  hasProfile: boolean;
  profileData?: {
    guide_name: string;
    primary_tradition: string;
    created_at: string;
    last_active_at: string;
  };
}

export async function GET() {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const managementToken = process.env.SUPABASE_MANAGEMENT_TOKEN;
  if (!managementToken) {
    return NextResponse.json({ error: 'Supabase Management Token not configured' }, { status: 500 });
  }

  try {
    // Query auth.users via Supabase Management API
    const authUsersResponse = await fetch(
      `https://api.supabase.com/v1/projects/atldnpjaxaeqzgtqbrpy/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `SELECT id, email, created_at, email_confirmed_at, last_sign_in_at, raw_app_meta_data 
                   FROM auth.users 
                   ORDER BY created_at DESC`
        }),
      }
    );

    if (!authUsersResponse.ok) {
      const errorText = await authUsersResponse.text();
      console.error('Auth users query failed:', errorText);
      return NextResponse.json({ 
        error: 'Failed to query auth users',
        details: errorText
      }, { status: 500 });
    }

    const authUsersData = await authUsersResponse.json();
    const authUsers: AuthUser[] = authUsersData.result || [];

    // Get all user profiles
    const profilesRes = await faithSupabase.from('fj_user_profiles').select('*');
    if (profilesRes.error) {
      console.error('Profiles fetch error:', profilesRes.error);
      return NextResponse.json({ 
        error: 'Failed to fetch user profiles',
        details: profilesRes.error.message
      }, { status: 500 });
    }

    const profiles = profilesRes.data || [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Combine auth users with profile data
    const usersWithProfiles: UserWithProfile[] = authUsers.map(user => {
      const profile = profileMap.get(user.id);
      return {
        ...user,
        hasProfile: !!profile,
        profileData: profile ? {
          guide_name: profile.guide_name,
          primary_tradition: profile.primary_tradition,
          created_at: profile.created_at,
          last_active_at: profile.last_active_at,
        } : undefined,
      };
    });

    return NextResponse.json({
      users: usersWithProfiles,
      totalAuthUsers: authUsers.length,
      totalWithProfiles: profiles.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const managementToken = process.env.SUPABASE_MANAGEMENT_TOKEN;
  if (!managementToken) {
    return NextResponse.json({ error: 'Supabase Management Token not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }

    // Delete user from auth.users via Management API
    const deleteUserResponse = await fetch(
      `https://api.supabase.com/v1/projects/atldnpjaxaeqzgtqbrpy/auth/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
        },
      }
    );

    if (!deleteUserResponse.ok) {
      const errorText = await deleteUserResponse.text();
      console.error('Auth user deletion failed:', errorText);
      return NextResponse.json({ 
        error: 'Failed to delete auth user',
        details: errorText
      }, { status: 500 });
    }

    // Clean up related data in parallel
    const cleanupPromises = [
      faithSupabase.from('fj_user_profiles').delete().eq('id', userId),
      faithSupabase.from('fj_conversations').delete().eq('user_id', userId),
      faithSupabase.from('fj_messages').delete().eq('user_id', userId),
      faithSupabase.from('fj_lesson_progress').delete().eq('user_id', userId),
      faithSupabase.from('fj_api_usage').delete().eq('user_id', userId),
    ];

    await Promise.all(cleanupPromises);

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully',
      userId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}