import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const FAMILY_PATH = path.join(process.env.HOME || '', 'clawd/config/family.json');

export async function GET() {
  try {
    const content = await fs.readFile(FAMILY_PATH, 'utf-8');
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load family data:', error);
    return NextResponse.json({ error: 'Failed to load family data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const updates = await request.json();
    
    // Read existing data
    let data = {};
    try {
      const content = await fs.readFile(FAMILY_PATH, 'utf-8');
      data = JSON.parse(content);
    } catch {
      // File doesn't exist, start fresh
    }
    
    // Merge updates
    const updated = { ...data, ...updates, lastUpdated: new Date().toISOString().split('T')[0] };
    
    // Write back
    await fs.writeFile(FAMILY_PATH, JSON.stringify(updated, null, 2));
    
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to save family data:', error);
    return NextResponse.json({ error: 'Failed to save family data' }, { status: 500 });
  }
}
