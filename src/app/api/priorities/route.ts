import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PRIORITIES_FILE = path.join(process.cwd(), "public", "data", "joshua-priorities.json");
const SUPABASE_URL = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

interface Priority {
  text: string;
  source: string;
  urgency: string;
  completed?: boolean;
  completedAt?: string;
}

interface JoshuaPriorities {
  date: string;
  generatedAt: string;
  priorities: Priority[];
  agentHandled: any[];
}

// Fetch ALL completions from Supabase
async function getCompletions(): Promise<Record<string, string>> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/priority_completions?select=*`,
      { headers: supabaseHeaders, cache: "no-store" }
    );
    if (!res.ok) return {};
    const rows = await res.json();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.id] = row.completed_at;
    }
    return map;
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const completionsOnly = searchParams.get("completions");

    // If ?completions=true, return raw completions map (used by standups page)
    if (completionsOnly === "true") {
      const completions = await getCompletions();
      return NextResponse.json({ completions });
    }

    if (!fs.existsSync(PRIORITIES_FILE)) {
      return NextResponse.json({ error: "Priorities file not found" }, { status: 404 });
    }

    const data: JoshuaPriorities = JSON.parse(fs.readFileSync(PRIORITIES_FILE, "utf8"));
    
    // Merge completion state from Supabase
    const completions = await getCompletions();
    
    // Apply completions to priorities by index AND text
    data.priorities = data.priorities.map((p, i) => {
      const key = `priority:${i}`;
      const textKey = `action:${hashText(p.text)}`;
      const completedAt = completions[key] || completions[textKey];
      if (completedAt) {
        return { ...p, completed: true, completedAt };
      }
      return p;
    });

    // Apply completions to agent handled items by index
    data.agentHandled = (data.agentHandled || []).map((a: any, i: number) => {
      const key = `agent:${i}`;
      const textKey = `action:${hashText(a.text)}`;
      const completedAt = completions[key] || completions[textKey];
      if (completedAt && a.status !== "done") {
        return { ...a, completed: true, completedAt, status: "done" };
      }
      return a;
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading priorities:", error);
    return NextResponse.json({ error: "Failed to load priorities" }, { status: 500 });
  }
}

// Simple hash for text-based keys (stable, short)
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, completed, completedAt, index, type } = body;

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Missing required field: completed" },
        { status: 400 }
      );
    }

    // Build a stable ID from the text content
    // This works for both priorities and standup action items
    let id = body.id;
    if (!id && text) {
      id = `action:${hashText(text)}`;
    }
    if (!id && index !== undefined) {
      id = `${type || "priority"}:${index}`;
    }

    if (!id) {
      return NextResponse.json({ error: "Could not determine priority ID" }, { status: 400 });
    }

    if (completed) {
      // Upsert completion into Supabase
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/priority_completions`,
        {
          method: "POST",
          headers: { ...supabaseHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            id,
            completed_at: completedAt || new Date().toISOString(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("Supabase upsert error:", err);
        return NextResponse.json({ error: "Failed to save completion" }, { status: 500 });
      }

      const result = await res.json();
      return NextResponse.json({ success: true, completion: result });
    } else {
      // Delete completion from Supabase (unchecking)
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/priority_completions?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: supabaseHeaders,
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("Supabase delete error:", err);
        return NextResponse.json({ error: "Failed to remove completion" }, { status: 500 });
      }

      return NextResponse.json({ success: true, removed: id });
    }
  } catch (error) {
    console.error("Error updating priority:", error);
    return NextResponse.json({ error: "Failed to update priority" }, { status: 500 });
  }
}
