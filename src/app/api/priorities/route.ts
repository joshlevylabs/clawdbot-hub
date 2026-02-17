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

// Fetch completions from Supabase
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
      // id format: "priority:INDEX" or "agent:INDEX" or text-based key
      map[row.id] = row.completed_at;
    }
    return map;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(PRIORITIES_FILE)) {
      return NextResponse.json({ error: "Priorities file not found" }, { status: 404 });
    }

    const data: JoshuaPriorities = JSON.parse(fs.readFileSync(PRIORITIES_FILE, "utf8"));
    
    // Merge completion state from Supabase
    const completions = await getCompletions();
    
    // Apply completions to priorities by index
    data.priorities = data.priorities.map((p, i) => {
      const key = `priority:${i}`;
      const textKey = `priority:text:${p.text}`;
      const completedAt = completions[key] || completions[textKey];
      if (completedAt) {
        return { ...p, completed: true, completedAt };
      }
      return p;
    });

    // Apply completions to agent handled items by index
    data.agentHandled = (data.agentHandled || []).map((a: any, i: number) => {
      const key = `agent:${i}`;
      const completedAt = completions[key];
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

    // Determine the ID to use
    let id = body.id;
    if (!id && index !== undefined) {
      id = `${type || "priority"}:${index}`;
    }
    if (!id && text) {
      // Find by text match in file to get index
      const data: JoshuaPriorities = JSON.parse(fs.readFileSync(PRIORITIES_FILE, "utf8"));
      const idx = data.priorities.findIndex(p => p.text === text);
      if (idx !== -1) {
        id = `priority:${idx}`;
      } else {
        // Also try text-based key
        id = `priority:text:${text}`;
      }
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
