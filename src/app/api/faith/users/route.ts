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
    primary_tradition: string | null;
    created_at: string;
    last_active_at: string;
    traditions: string[];
    selected_tradition_ids: string[];
    onboarding_complete: boolean;
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
    // Management API returns a plain array, not {result: [...]}
    const authUsers: AuthUser[] = Array.isArray(authUsersData) ? authUsersData : (authUsersData.result || []);

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
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    // Combine auth users with profile data
    const usersWithProfiles: UserWithProfile[] = authUsers.map(user => {
      const profile = profileMap.get(user.id);
      const onboarding = profile?.onboarding as Record<string, any> | null;
      
      // Derive primary tradition from onboarding data
      let primaryTradition: string | null = null;
      if (onboarding?.baseline_tradition_id) {
        primaryTradition = onboarding.baseline_tradition_id;
      } else if (onboarding?.tradition) {
        if (typeof onboarding.tradition === 'string') {
          primaryTradition = onboarding.tradition;
        } else if (Array.isArray(onboarding.tradition) && onboarding.tradition.length > 0) {
          primaryTradition = onboarding.tradition[0];
        }
      }
      
      return {
        ...user,
        hasProfile: !!profile,
        profileData: profile ? {
          guide_name: profile.guide_name,
          primary_tradition: primaryTradition,
          created_at: profile.created_at,
          last_active_at: profile.updated_at,
          traditions: onboarding?.tradition ? (Array.isArray(onboarding.tradition) ? onboarding.tradition : [onboarding.tradition]) : [],
          selected_tradition_ids: onboarding?.selected_tradition_ids || [],
          onboarding_complete: !!onboarding,
        } : undefined,
      };
    });

    // Build anonymized tradition breakdown
    // The onboarding data can have:
    //   - tradition: string (specific denomination ID like "orthodox-judaism") — current format
    //   - tradition: string[] (family key like ["judaism"]) — legacy format
    //   - baseline_tradition_id: string (specific denomination ID) — always set in current format
    //   - selected_tradition_ids: string[] (traditions they want to explore)
    const traditionCounts: Record<string, number> = {};
    let onboardingIncomplete = 0;
    
    for (const profile of profiles) {
      const onboarding = profile.onboarding as Record<string, any> | null;
      
      if (!onboarding) {
        onboardingIncomplete++;
        continue;
      }
      
      // Determine primary tradition — prefer baseline_tradition_id (specific denomination)
      let primaryTradition: string | null = null;
      
      if (onboarding.baseline_tradition_id && typeof onboarding.baseline_tradition_id === 'string') {
        // Current format: specific denomination ID
        primaryTradition = onboarding.baseline_tradition_id;
      } else if (onboarding.tradition) {
        if (typeof onboarding.tradition === 'string') {
          primaryTradition = onboarding.tradition;
        } else if (Array.isArray(onboarding.tradition) && onboarding.tradition.length > 0) {
          // Legacy format: array of family keys — use first entry
          primaryTradition = onboarding.tradition[0];
        }
      }
      
      if (primaryTradition) {
        traditionCounts[primaryTradition] = (traditionCounts[primaryTradition] || 0) + 1;
      }
      
      // Also count selected_tradition_ids (additional traditions they're exploring)
      if (onboarding.selected_tradition_ids && Array.isArray(onboarding.selected_tradition_ids)) {
        for (const t of onboarding.selected_tradition_ids) {
          // Skip if it's the same as primary (don't double count)
          if (t === primaryTradition) continue;
          const key = `exploring:${t}`;
          traditionCounts[key] = (traditionCounts[key] || 0) + 1;
        }
      }
    }
    
    // Include incomplete onboarding count so the frontend can display it
    if (onboardingIncomplete > 0) {
      traditionCounts['_onboarding_incomplete'] = onboardingIncomplete;
    }

    return NextResponse.json({
      users: usersWithProfiles,
      totalAuthUsers: authUsers.length,
      totalWithProfiles: profiles.length,
      traditionBreakdown: traditionCounts,
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

    // Delete user from auth.users via Supabase Management API (SQL query)
    // Must delete from auth.identities first (FK constraint), then auth.users
    const deleteResponse = await fetch(
      `https://api.supabase.com/v1/projects/atldnpjaxaeqzgtqbrpy/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            DELETE FROM auth.identities WHERE user_id = '${userId}';
            DELETE FROM auth.sessions WHERE user_id = '${userId}';
            DELETE FROM auth.refresh_tokens WHERE instance_id IN (
              SELECT instance_id FROM auth.users WHERE id = '${userId}'
            );
            DELETE FROM auth.mfa_factors WHERE user_id = '${userId}';
            DELETE FROM auth.users WHERE id = '${userId}';
          `
        }),
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Auth user deletion failed:', errorText);
      return NextResponse.json({ 
        error: 'Failed to delete auth user',
        details: errorText
      }, { status: 500 });
    }

    // Clean up related data in parallel
    const cleanupPromises = [
      faithSupabase.from('fj_user_profiles').delete().eq('user_id', userId),
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