import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || "";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// GET — return all completed priority IDs
export async function GET() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/priority_completions?select=id,completed_at`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch completions" }, { status: 500 });
    }
    const rows = await res.json();
    // Return as a set of completed IDs
    const completedIds: Record<string, string> = {};
    for (const row of rows) {
      completedIds[row.id] = row.completed_at;
    }
    return NextResponse.json({ completedIds });
  } catch (err) {
    console.error("Error fetching completions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — toggle a priority completion
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, completed } = body;
    // id: "priority:0", "priority:1", "agent:0", etc.
    // completed: boolean

    if (!id || completed == null) {
      return NextResponse.json(
        { error: "Missing required fields: id, completed" },
        { status: 400 }
      );
    }

    if (completed) {
      // Upsert into completions table
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/priority_completions`,
        {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ id, completed_at: new Date().toISOString() }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error("Supabase upsert error:", err);
        return NextResponse.json({ error: "Failed to save completion" }, { status: 500 });
      }
    } else {
      // Delete from completions table
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/priority_completions?id=eq.${encodeURIComponent(id)}`,
        { method: "DELETE", headers }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error("Supabase delete error:", err);
        return NextResponse.json({ error: "Failed to remove completion" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, id, completed });
  } catch (err) {
    console.error("Error updating completion:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
