import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';
import { FAITH_TRADITIONS } from '@/lib/faith-traditions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch all data in parallel
    const [
      usersRes,
      conversationsRes,
      lessonsRes,
      prayersRes,
      dailyPrayersRes,
      messagesRes,
      lessonProgressRes,
    ] = await Promise.all([
      faithSupabase.from('fj_user_profiles').select('*'),
      faithSupabase.from('fj_conversations').select('*'),
      faithSupabase.from('faith_lessons').select('*'),
      faithSupabase.from('faith_prayers').select('*'),
      faithSupabase.from('faith_daily_prayers').select('*'),
      faithSupabase.from('fj_messages').select('*'),
      faithSupabase.from('fj_lesson_progress').select('*'),
    ]);

    // Check for errors
    if (usersRes.error) console.error('Users fetch error:', usersRes.error);
    if (conversationsRes.error) console.error('Conversations fetch error:', conversationsRes.error);
    if (lessonsRes.error) console.error('Lessons fetch error:', lessonsRes.error);
    if (prayersRes.error) console.error('Prayers fetch error:', prayersRes.error);
    if (dailyPrayersRes.error) console.error('Daily prayers fetch error:', dailyPrayersRes.error);
    if (messagesRes.error) console.error('Messages fetch error:', messagesRes.error);
    if (lessonProgressRes.error) console.error('Lesson progress fetch error:', lessonProgressRes.error);

    // Get the data (handle potential nulls)
    const users = usersRes.data || [];
    const conversations = conversationsRes.data || [];
    const lessons = lessonsRes.data || [];
    const prayers = prayersRes.data || [];
    const dailyPrayers = dailyPrayersRes.data || [];
    const messages = messagesRes.data || [];
    const lessonProgress = lessonProgressRes.data || [];

    // Calculate overview stats
    const totalUsers = users.length;
    
    // Active guides = distinct conversations with recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeGuides = conversations.filter((conv: any) => {
      const updatedAt = new Date(conv.updated_at || conv.created_at);
      return updatedAt > sevenDaysAgo;
    }).length;

    const totalLessons = lessons.length;
    const totalPrayers = prayers.length + dailyPrayers.length;

    // Process users data for table
    const usersTableData = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      guideName: user.guide_name || 'Anonymous Guide',
      tradition: user.primary_tradition || 'Not set',
      onboardingDate: user.created_at,
      lastActive: user.last_active_at || user.updated_at || user.created_at,
    }));

    // Process conversations with message counts
    const conversationsWithData = conversations.map((conv: any) => {
      const convMessages = messages.filter((msg: any) => msg.conversation_id === conv.id);
      return {
        id: conv.id,
        userId: conv.user_id,
        guideName: conv.guide_name || 'Guide',
        messageCount: convMessages.length,
        lastMessageDate: convMessages.length > 0 
          ? convMessages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : conv.updated_at || conv.created_at,
        status: conv.status || 'active',
        createdAt: conv.created_at,
      };
    });

    // Process lessons with completion counts
    const lessonsWithProgress = lessons.map((lesson: any) => {
      const completions = lessonProgress.filter((lp: any) => lp.lesson_id === lesson.id);
      const content = lesson.baseline_text || lesson.content || '';
      // Estimate reading time: ~200 words per minute
      const wordCount = content.split(/\s+/).length;
      const readingTime = Math.max(1, Math.round(wordCount / 200));
      return {
        id: lesson.id,
        title: lesson.topic || lesson.title || `Lesson ${lesson.id}`,
        tradition: lesson.tradition || 'General',
        difficulty: lesson.difficulty || 'medium',
        completionCount: completions.length,
        date: lesson.date || lesson.created_at,
        createdAt: lesson.created_at,
        content,
        estimatedReadingTime: readingTime,
        scriptureRef: lesson.scripture_ref || null,
        parsha: lesson.parsha || null,
        hebrewDate: lesson.hebrew_date || null,
        calendarContext: lesson.calendar_context || null,
        baselineTraditionId: lesson.baseline_tradition_id || null,
        baselineText: lesson.baseline_text || null,
      };
    });

    // Process prayers
    const prayersData = [
      ...prayers.map((prayer: any) => ({
        id: prayer.id,
        title: prayer.title || 'Untitled Prayer',
        tradition: prayer.tradition || 'General',
        type: 'library',
        dateCreated: prayer.created_at,
      })),
      ...dailyPrayers.map((prayer: any) => ({
        id: prayer.id,
        title: prayer.title || `Daily Prayer - ${new Date(prayer.date).toLocaleDateString()}`,
        tradition: prayer.tradition || 'General',
        type: 'daily',
        dateCreated: prayer.date || prayer.created_at,
      })),
    ];

    return NextResponse.json({
      overview: {
        totalUsers,
        activeGuides,
        totalLessons,
        totalPrayers,
      },
      users: usersTableData,
      guides: {
        traditions: FAITH_TRADITIONS,
        conversations: conversationsWithData,
      },
      lessons: lessonsWithProgress,
      texts: prayersData,
      conversations: conversationsWithData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Faith dashboard API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}