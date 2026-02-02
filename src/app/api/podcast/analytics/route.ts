import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PlatformMetrics {
  platform: string;
  followers?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  subscribers?: number;
  openRate?: number;
  clickRate?: number;
  posts?: number;
  lastUpdated: string;
  error?: string;
}

interface VideoMetric {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  thumbnail?: string;
}

// YouTube Data API - fetch channel stats and recent videos
async function fetchYouTubeMetrics(apiKey: string, channelId: string): Promise<{
  channel: PlatformMetrics;
  videos: VideoMetric[];
}> {
  try {
    // Get channel stats
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
    );
    const channelData = await channelRes.json();
    
    if (!channelData.items?.[0]) {
      throw new Error('Channel not found');
    }
    
    const stats = channelData.items[0].statistics;
    
    // Get recent videos
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&type=video&key=${apiKey}`
    );
    const videosData = await videosRes.json();
    
    const videoIds = videosData.items?.map((v: { id: { videoId: string } }) => v.id.videoId).join(',') || '';
    
    let videos: VideoMetric[] = [];
    if (videoIds) {
      const videoStatsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
      );
      const videoStatsData = await videoStatsRes.json();
      
      videos = videoStatsData.items?.map((v: {
        id: string;
        snippet: { title: string; publishedAt: string; thumbnails: { medium: { url: string } } };
        statistics: { viewCount: string; likeCount: string; commentCount: string };
      }) => ({
        id: v.id,
        title: v.snippet.title,
        views: parseInt(v.statistics.viewCount) || 0,
        likes: parseInt(v.statistics.likeCount) || 0,
        comments: parseInt(v.statistics.commentCount) || 0,
        publishedAt: v.snippet.publishedAt,
        thumbnail: v.snippet.thumbnails?.medium?.url,
      })) || [];
    }
    
    return {
      channel: {
        platform: 'youtube',
        subscribers: parseInt(stats.subscriberCount) || 0,
        views: parseInt(stats.viewCount) || 0,
        posts: parseInt(stats.videoCount) || 0,
        lastUpdated: new Date().toISOString(),
      },
      videos,
    };
  } catch (error) {
    return {
      channel: {
        platform: 'youtube',
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Failed to fetch YouTube data',
      },
      videos: [],
    };
  }
}

// Beehiiv API - fetch publication stats
async function fetchBeehiivMetrics(apiKey: string, publicationId: string): Promise<PlatformMetrics> {
  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );
    
    if (!res.ok) {
      throw new Error(`Beehiiv API error: ${res.status}`);
    }
    
    const data = await res.json();
    const pub = data.data;
    
    return {
      platform: 'beehiiv',
      subscribers: pub.stats?.total_subscribers || 0,
      openRate: pub.stats?.average_open_rate || 0,
      clickRate: pub.stats?.average_click_rate || 0,
      posts: pub.stats?.total_posts || 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    return {
      platform: 'beehiiv',
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch Beehiiv data',
    };
  }
}

// Manual metrics from local JSON (for platforms without APIs)
async function fetchManualMetrics(): Promise<PlatformMetrics[]> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'data', 'podcast', 'manual-metrics.json');
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data.platforms || [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform');
  
  const results: {
    youtube?: { channel: PlatformMetrics; videos: VideoMetric[] };
    beehiiv?: PlatformMetrics;
    manual?: PlatformMetrics[];
  } = {};
  
  // YouTube
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const youtubeChannelId = process.env.YOUTUBE_CHANNEL_ID || 'UCxxxxxxxx'; // Extract from channel URL
  
  if (!platform || platform === 'youtube') {
    if (youtubeApiKey) {
      results.youtube = await fetchYouTubeMetrics(youtubeApiKey, youtubeChannelId);
    } else {
      results.youtube = {
        channel: {
          platform: 'youtube',
          lastUpdated: new Date().toISOString(),
          error: 'YouTube API key not configured. Add YOUTUBE_API_KEY to environment.',
        },
        videos: [],
      };
    }
  }
  
  // Beehiiv
  const beehiivApiKey = process.env.BEEHIIV_API_KEY;
  const beehiivPubId = process.env.BEEHIIV_PUBLICATION_ID;
  
  if (!platform || platform === 'beehiiv') {
    if (beehiivApiKey && beehiivPubId) {
      results.beehiiv = await fetchBeehiivMetrics(beehiivApiKey, beehiivPubId);
    } else {
      results.beehiiv = {
        platform: 'beehiiv',
        lastUpdated: new Date().toISOString(),
        error: 'Beehiiv API not configured. Add BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID to environment.',
      };
    }
  }
  
  // Manual metrics (LinkedIn, TikTok, Medium)
  if (!platform || platform === 'manual') {
    results.manual = await fetchManualMetrics();
  }
  
  return NextResponse.json(results);
}

// POST endpoint to update manual metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platforms } = body as { platforms: PlatformMetrics[] };
    
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.join(process.cwd(), 'public', 'data', 'podcast');
    const filePath = path.join(dir, 'manual-metrics.json');
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify({ 
      platforms,
      updatedAt: new Date().toISOString(),
    }, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save metrics'
    }, { status: 500 });
  }
}
