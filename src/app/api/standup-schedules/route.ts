import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || "";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// Helper to ensure table exists
async function ensureTableExists() {
  try {
    const testRes = await fetch(
      `${SUPABASE_URL}/rest/v1/standup_schedules?limit=0`,
      { headers: { ...headers, Prefer: "count=exact" }, cache: "no-store" }
    );
    
    return testRes.ok;
  } catch (err) {
    return false;
  }
}

// GET — return all standup schedules
export async function GET() {
  try {
    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Standup schedules table not found", 
        schedules: [],
        tableExists: false 
      }, { status: 503 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/standup_schedules?select=*&order=time.asc`,
      { headers, cache: "no-store" }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase fetch error:", err);
      return NextResponse.json({ error: "Failed to fetch standup schedules" }, { status: 500 });
    }
    
    const schedules = await res.json();
    return NextResponse.json({ schedules, tableExists: true });
  } catch (err) {
    console.error("Error fetching standup schedules:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create a new standup schedule
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, name, emoji, schedule, time, participants, agenda, auto_execute, verticals, initiatives } = body;

    if (!key || !name || !schedule || !time) {
      return NextResponse.json(
        { error: "Missing required fields: key, name, schedule, time" },
        { status: 400 }
      );
    }

    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Standup schedules table not found - please create tables manually" 
      }, { status: 503 });
    }

    const standupSchedule = {
      key,
      name,
      emoji: emoji || "📅",
      schedule,
      time,
      participants: participants || [],
      agenda: agenda || "",
      auto_execute: auto_execute || false,
      verticals: verticals || [],
      initiatives: initiatives || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/standup_schedules`,
      {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(standupSchedule),
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase create error:", err);
      return NextResponse.json({ error: "Failed to create standup schedule" }, { status: 500 });
    }
    
    const created = await res.json();
    return NextResponse.json({ schedule: created[0] || created, success: true });
  } catch (err) {
    console.error("Error creating standup schedule:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — update a standup schedule
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, name, emoji, schedule, time, participants, agenda, auto_execute, verticals, initiatives } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Missing required field: key" },
        { status: 400 }
      );
    }

    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Standup schedules table not found - please create tables manually" 
      }, { status: 503 });
    }

    const updates = {
      ...(name && { name }),
      ...(emoji && { emoji }),
      ...(schedule && { schedule }),
      ...(time && { time }),
      ...(participants && { participants }),
      ...(agenda !== undefined && { agenda }),
      ...(auto_execute !== undefined && { auto_execute }),
      ...(verticals && { verticals }),
      ...(initiatives && { initiatives }),
      updated_at: new Date().toISOString()
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/standup_schedules?key=eq.${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(updates),
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase update error:", err);
      return NextResponse.json({ error: "Failed to update standup schedule" }, { status: 500 });
    }
    
    const updated = await res.json();
    return NextResponse.json({ schedule: updated[0] || updated, success: true });
  } catch (err) {
    console.error("Error updating standup schedule:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete a standup schedule
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: "Missing required parameter: key" },
        { status: 400 }
      );
    }

    const tableExists = await ensureTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: "Standup schedules table not found - please create tables manually" 
      }, { status: 503 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/standup_schedules?key=eq.${encodeURIComponent(key)}`,
      {
        method: "DELETE",
        headers,
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase delete error:", err);
      return NextResponse.json({ error: "Failed to delete standup schedule" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, deleted: key });
  } catch (err) {
    console.error("Error deleting standup schedule:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}