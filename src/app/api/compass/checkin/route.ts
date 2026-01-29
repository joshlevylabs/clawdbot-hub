import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const INTERACTIONS_FILE = path.join(process.cwd(), '..', 'tools', 'jillian', 'data', 'interactions.json');
const COMPASS_STATE_FILE = path.join(DATA_DIR, 'compass-state.json');

interface CheckinData {
  power: number;
  safety: number;
  answers: Record<string, { label: string; power: number; safety: number }>;
}

async function loadJson(filepath: string) {
  try {
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveJson(filepath: string, data: unknown) {
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

function calculateTimeWeight(dateStr: string, halfLifeDays = 30): number {
  const interactionDate = new Date(dateStr);
  const now = new Date();
  const daysAgo = (now.getTime() - interactionDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(Math.pow(0.5, daysAgo / halfLifeDays), 0.1);
}

function calculateCompassPosition(interactions: Array<{ compass?: { power: number; safety: number }; timestamp?: string; date?: string }>) {
  if (!interactions.length) {
    return { power: 0, safety: 0, quadrant: 'unknown', quadrantName: 'No Data', inIdealZone: false, count: 0 };
  }

  let totalWeight = 0;
  let weightedPower = 0;
  let weightedSafety = 0;

  for (const interaction of interactions) {
    const compass = interaction.compass;
    if (!compass) continue;

    const timestamp = interaction.timestamp || interaction.date || new Date().toISOString();
    const weight = calculateTimeWeight(timestamp);

    weightedPower += compass.power * weight;
    weightedSafety += compass.safety * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return { power: 0, safety: 0, quadrant: 'unknown', quadrantName: 'No Data', inIdealZone: false, count: 0 };
  }

  const avgPower = weightedPower / totalWeight;
  const avgSafety = weightedSafety / totalWeight;

  let quadrant: string;
  let quadrantName: string;

  if (avgPower >= 0 && avgSafety >= 0) {
    quadrant = 'topRight';
    quadrantName = 'Secure Leadership Partnership';
  } else if (avgPower < 0 && avgSafety >= 0) {
    quadrant = 'topLeft';
    quadrantName = 'Codependent / Enmeshed';
  } else if (avgPower >= 0 && avgSafety < 0) {
    quadrant = 'bottomRight';
    quadrantName = 'Authoritarian / Abusive';
  } else {
    quadrant = 'bottomLeft';
    quadrantName = 'Detached / Avoidant';
  }

  const inIdealZone = avgPower >= 0 && avgPower <= 2 && avgSafety >= 3 && avgSafety <= 5;

  return {
    power: Math.round(avgPower * 100) / 100,
    safety: Math.round(avgSafety * 100) / 100,
    quadrant,
    quadrantName,
    inIdealZone,
    count: interactions.filter(i => i.compass).length,
    calculatedAt: new Date().toISOString()
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckinData = await request.json();
    
    if (typeof body.power !== 'number' || typeof body.safety !== 'number') {
      return NextResponse.json({ error: 'Invalid data: power and safety must be numbers' }, { status: 400 });
    }

    // Create interaction record
    const now = new Date();
    const interaction = {
      id: `checkin-${now.getTime()}`,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].slice(0, 5),
      type: 'daily_checkin',
      description: 'Daily check-in questionnaire',
      compass: {
        power: body.power,
        safety: body.safety
      },
      answers: body.answers,
      tags: ['checkin', 'questionnaire']
    };

    // Load existing interactions
    let interactionsData = await loadJson(INTERACTIONS_FILE);
    if (!interactionsData) {
      interactionsData = { version: '2.0', interactions: [] };
    }

    // Add new interaction
    interactionsData.interactions.push(interaction);

    // Save interactions
    await saveJson(INTERACTIONS_FILE, interactionsData);

    // Calculate new compass position
    const compassInteractions = interactionsData.interactions.filter((i: { compass?: unknown }) => i.compass);
    const position = calculateCompassPosition(compassInteractions);

    // Update compass state for the Hub
    const compassState = {
      current: position,
      trend: { power: 0, safety: 0 },
      recentCount: compassInteractions.length,
      totalCount: compassInteractions.length,
      quadrants: {},
      idealZone: { power: [0, 2], safety: [3, 5] }
    };

    await saveJson(COMPASS_STATE_FILE, compassState);

    return NextResponse.json({
      success: true,
      interaction,
      compass: position
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const compassState = await loadJson(COMPASS_STATE_FILE);
    return NextResponse.json(compassState || { current: null });
  } catch {
    return NextResponse.json({ error: 'Failed to load compass state' }, { status: 500 });
  }
}
