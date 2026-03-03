import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SHOWS_DATA_PATH = path.join(process.cwd(), 'public/data/marketing/shows.json');

export interface Show {
  id: string;
  name: string;
  description: string;
  frequency: string;
  coverArt: string | null;
  platforms: string[];
  episodeIndexPath: string;
  createdAt: string;
  episodes: any[];
}

export interface ShowsData {
  shows: Show[];
}

async function getShowsData(): Promise<ShowsData> {
  try {
    const data = await fs.readFile(SHOWS_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create default data
    const defaultData: ShowsData = {
      shows: [
        {
          id: "builders-frequency",
          name: "The Builder's Frequency",
          description: "Insights for builders creating while employed",
          frequency: "weekly",
          coverArt: null,
          platforms: ["youtube", "spotify", "apple"],
          episodeIndexPath: "~/clawd/builders-frequency/episodes/index.json",
          createdAt: "2026-02-15",
          episodes: []
        }
      ]
    };
    
    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(SHOWS_DATA_PATH), { recursive: true });
    await fs.writeFile(SHOWS_DATA_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

async function saveShowsData(data: ShowsData): Promise<void> {
  await fs.writeFile(SHOWS_DATA_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const data = await getShowsData();
    return Response.json(data);
  } catch (error) {
    console.error('Error reading shows data:', error);
    return Response.json({ error: 'Failed to read shows data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    if (action === 'createShow') {
      const data = await getShowsData();
      const newShow: Show = {
        id: payload.id || `show-${Date.now()}`,
        name: payload.name,
        description: payload.description || '',
        frequency: payload.frequency || 'weekly',
        coverArt: payload.coverArt || null,
        platforms: payload.platforms || [],
        episodeIndexPath: payload.episodeIndexPath || '',
        createdAt: new Date().toISOString().split('T')[0],
        episodes: []
      };
      
      data.shows.push(newShow);
      await saveShowsData(data);
      
      return Response.json({ success: true, show: newShow });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing shows request:', error);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}