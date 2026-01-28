import { NextResponse } from "next/server";

// Hardcoded cron jobs data - in production, this would fetch from Clawdbot gateway
const cronJobs = [
  {
    id: "28c654c7-a297-421d-9a04-018f6acc9c0c",
    name: "Morning Brief",
    enabled: true,
    schedule: {
      kind: "cron",
      expr: "0 6 * * *",
      tz: "America/Los_Angeles",
    },
    payload: {
      message: "Morning brief for Joshua at 6am. Gather and deliver: Weather, Calendar (all 4 accounts), Important emails, World news (conservative/faith perspective), AI Intelligence updates.",
    },
    state: {
      nextRunAtMs: getNextRun("0 6 * * *"),
      lastRunAtMs: Date.now() - 86400000, // Yesterday
      lastStatus: "ok",
      lastDurationMs: 159242,
    },
  },
  {
    id: "3e6b9148-6cfc-4998-b052-c3316a647f65",
    name: "ScriptBot Weekly",
    enabled: true,
    schedule: {
      kind: "cron",
      expr: "0 9 * * 0",
      tz: "America/Los_Angeles",
    },
    payload: {
      message: "ScriptBot Weekly Trigger for The Builder's Frequency podcast. Suggest 5 episode topics based on content pillars and current events.",
    },
    state: {
      nextRunAtMs: getNextSunday9am(),
    },
  },
];

function getNextRun(cronExpr: string): number {
  // Simple calculation for next 6am
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

function getNextSunday9am(): number {
  const now = new Date();
  const next = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(9, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 7);
  }
  return next.getTime();
}

export async function GET() {
  return NextResponse.json({ jobs: cronJobs });
}
