import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const homedir = process.env.HOME || '/Users/joshualevy';
    const data = await readFile(join(homedir, '.clawdbot/cron/jobs.json'), 'utf-8');
    const parsed = JSON.parse(data);
    return NextResponse.json(parsed.jobs || []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export const dynamic = 'force-dynamic';
