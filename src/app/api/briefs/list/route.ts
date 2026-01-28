import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const briefsDir = path.join(process.cwd(), 'public', 'data', 'briefs');
    
    // Check if directory exists
    if (!fs.existsSync(briefsDir)) {
      return NextResponse.json({ briefs: [] });
    }
    
    // Get all JSON files
    const files = fs.readdirSync(briefsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first
    
    const briefs = files.map(file => {
      const filePath = path.join(briefsDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const date = file.replace('.json', '');
      
      // Check for audio
      const audioDir = path.join(process.cwd(), 'public', 'audio');
      const hasAudio = fs.existsSync(path.join(audioDir, `brief-${date}-prayer.mp3`));
      
      return {
        date,
        time: content.time || 'Unknown',
        hasAudio,
      };
    });
    
    return NextResponse.json({ briefs });
  } catch (error) {
    console.error('Failed to list briefs:', error);
    return NextResponse.json({ briefs: [] });
  }
}
