import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PipelineData {
  stages: Array<{
    id: string;
    name: string;
    target: number | string;
    description: string;
  }>;
  schedule: string;
  dailyContent: Array<{
    date: string;
    lessons: number;
    prayers: number;
    images: number;
    audio: number;
    status: string;
  }>;
  latestTraditions: {
    lessons: Array<{ tradition: string; count: number }>;
    audio: Array<{ tradition: string; count: number }>;
  };
  nextDate: string;
  coverage: {
    totalDays: number;
    completeDays: number;
    partialDays: number;
  };
}

async function runSupabaseQuery(query: string): Promise<any[]> {
  const MGMT_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN;
  const PROJECT_ID = 'atldnpjaxaeqzgtqbrpy';

  if (!MGMT_TOKEN) {
    throw new Error('SUPABASE_MANAGEMENT_TOKEN not configured');
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MGMT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`Supabase query failed: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.result || []);
}

function getStatusForDay(lessons: number, prayers: number, images: number): string {
  const lessonsTarget = 25;
  const prayersTarget = 25;
  const imagesTarget = 6;

  const lessonsComplete = lessons >= lessonsTarget;
  const prayersComplete = prayers >= prayersTarget;
  const imagesComplete = images >= imagesTarget;

  if (lessonsComplete && prayersComplete && imagesComplete) return 'complete';
  if (lessons > 0 || prayers > 0 || images > 0) return 'partial';
  return 'missing';
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function GET() {
  try {
    // Query 1: Lessons by date (last 14 days)
    const lessonsData = await runSupabaseQuery(`
      SELECT date, COUNT(*) as count 
      FROM faith_lessons 
      WHERE date >= CURRENT_DATE - INTERVAL '14 days' 
      GROUP BY date 
      ORDER BY date DESC
    `);

    // Query 2: Prayers by date
    const prayersData = await runSupabaseQuery(`
      SELECT date, COUNT(*) as count 
      FROM faith_daily_prayers 
      WHERE date >= CURRENT_DATE - INTERVAL '14 days' 
      AND date <= CURRENT_DATE + INTERVAL '7 days' 
      GROUP BY date 
      ORDER BY date DESC
    `);

    // Query 3: Images by date
    const imagesData = await runSupabaseQuery(`
      SELECT date, COUNT(*) as count 
      FROM faith_daily_images 
      WHERE date >= CURRENT_DATE - INTERVAL '14 days' 
      GROUP BY date 
      ORDER BY date DESC
    `);

    // Query 4: Audio by date
    const audioData = await runSupabaseQuery(`
      SELECT date, COUNT(*) as count 
      FROM faith_lesson_audio 
      WHERE date >= CURRENT_DATE - INTERVAL '14 days' 
      GROUP BY date 
      ORDER BY date DESC
    `);

    // Query 5: Lesson traditions for latest date
    const lessonTraditionsData = await runSupabaseQuery(`
      SELECT tradition, COUNT(*) as count 
      FROM faith_lessons 
      WHERE date = (
        SELECT MAX(date) 
        FROM faith_lessons 
        WHERE date <= CURRENT_DATE + INTERVAL '2 days'
      ) 
      GROUP BY tradition 
      ORDER BY tradition
    `);

    // Query 6: Audio traditions for latest date
    const audioTraditionsData = await runSupabaseQuery(`
      SELECT tradition_name, COUNT(*) as count 
      FROM faith_lesson_audio 
      WHERE date = (SELECT MAX(date) FROM faith_lesson_audio) 
      GROUP BY tradition_name 
      ORDER BY tradition_name
    `);

    // Create lookup maps
    const lessonsMap = new Map(lessonsData.map(row => [row.date, row.count]));
    const prayersMap = new Map(prayersData.map(row => [row.date, row.count]));
    const imagesMap = new Map(imagesData.map(row => [row.date, row.count]));
    const audioMap = new Map(audioData.map(row => [row.date, row.count]));

    // Generate daily content for last 14 days
    const dailyContent = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = addDays(today, -i);
      const dateStr = formatDate(date);
      
      const lessons = lessonsMap.get(dateStr) || 0;
      const prayers = prayersMap.get(dateStr) || 0;
      const images = imagesMap.get(dateStr) || 0;
      const audio = audioMap.get(dateStr) || 0;
      
      dailyContent.push({
        date: dateStr,
        lessons,
        prayers,
        images,
        audio,
        status: getStatusForDay(lessons, prayers, images)
      });
    }

    // Calculate coverage stats
    const totalDays = dailyContent.length;
    const completeDays = dailyContent.filter(day => day.status === 'complete').length;
    const partialDays = dailyContent.filter(day => day.status === 'partial').length;

    // Find next date (max lesson date + 1)
    const maxLessonDate = lessonsData.length > 0 ? 
      new Date(Math.max(...lessonsData.map(row => new Date(row.date).getTime()))) :
      new Date();
    const nextDate = formatDate(addDays(maxLessonDate, 1));

    const pipelineData: PipelineData = {
      stages: [
        { 
          id: "lessons", 
          name: "Lessons & Perspectives", 
          target: 25, 
          description: "25 traditions × 24 perspectives each" 
        },
        { 
          id: "prayers", 
          name: "Daily Prayers", 
          target: 25, 
          description: "25 tradition-specific prayers" 
        },
        { 
          id: "images", 
          name: "Daily Images", 
          target: 6, 
          description: "6 devotional images" 
        },
        { 
          id: "audio", 
          name: "Audio Narration", 
          target: "dynamic", 
          description: "Active user traditions only" 
        }
      ],
      schedule: "Nightly at ~10:30 PM PT (generates next day's content)",
      dailyContent: dailyContent.reverse(), // Show most recent first
      latestTraditions: {
        lessons: lessonTraditionsData.map(row => ({ tradition: row.tradition, count: row.count })),
        audio: audioTraditionsData.map(row => ({ tradition: row.tradition_name, count: row.count }))
      },
      nextDate,
      coverage: {
        totalDays,
        completeDays,
        partialDays
      }
    };

    return NextResponse.json({ pipeline: pipelineData });

  } catch (error) {
    console.error('Pipeline API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch pipeline data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}