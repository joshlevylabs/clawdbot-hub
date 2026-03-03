import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SOCIAL_DATA_PATH = path.join(process.cwd(), 'public/data/marketing/social-metrics.json');

export interface SocialPlatform {
  name: string;
  platform: string;
  url: string;
  followers: number;
  views: number;
  engagement: number;
  lastUpdated: string;
}

interface SocialData {
  platforms: SocialPlatform[];
}

async function getData(): Promise<SocialData> {
  try {
    const data = await fs.readFile(SOCIAL_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { platforms: [] };
  }
}

async function saveData(data: SocialData): Promise<void> {
  await fs.mkdir(path.dirname(SOCIAL_DATA_PATH), { recursive: true });
  await fs.writeFile(SOCIAL_DATA_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const data = await getData();
    return Response.json(data);
  } catch (error) {
    console.error('Error reading social data:', error);
    return Response.json({ error: 'Failed to read social data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform: platformId, followers, views, engagement } = body;
    
    const data = await getData();
    const idx = data.platforms.findIndex(p => p.platform === platformId);
    if (idx === -1) {
      return Response.json({ error: 'Platform not found' }, { status: 404 });
    }
    
    if (followers !== undefined) data.platforms[idx].followers = followers;
    if (views !== undefined) data.platforms[idx].views = views;
    if (engagement !== undefined) data.platforms[idx].engagement = engagement;
    data.platforms[idx].lastUpdated = new Date().toISOString();
    
    await saveData(data);
    return Response.json({ success: true, platform: data.platforms[idx] });
  } catch (error) {
    console.error('Error saving social data:', error);
    return Response.json({ error: 'Failed to save' }, { status: 500 });
  }
}
