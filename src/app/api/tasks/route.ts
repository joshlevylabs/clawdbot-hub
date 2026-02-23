import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const TASK_REGISTRY_PATH = path.join(process.cwd(), "public", "data", "standups", "task-registry.json");
const SUPABASE_URL = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

interface Task {
  key: string;
  text: string;
  tag: "AGENT" | "JOSHUA" | "PLAN";
  priority: "high" | "medium" | "low";
  assignee: string;
  status: "pending" | "in-progress" | "done" | "done_but_unverified" | "resolved" | "approved";
  sourceStandup: string;
  sourceStandupType: string;
  sourceDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  sprintReady?: boolean;
  resolution?: string;
  specFile?: string;
}

interface TaskRegistry {
  nextAgentId: number;
  nextJoshuaId: number;
  tasks: Task[];
}

async function loadRegistry(): Promise<TaskRegistry> {
  try {
    const data = await fs.readFile(TASK_REGISTRY_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return { nextAgentId: 1, nextJoshuaId: 1, tasks: [] };
  }
}

// Fetch all task overrides from Supabase (sprint-ready flags + status overrides)
// Sprint flags: id = "sprint:<key>"
// Status overrides: id = "taskstatus:<key>" with completed_at encoding the status
//   We store status in the id as "taskstatus:<key>:<status>" for simplicity
async function getTaskOverrides(): Promise<{
  sprintReady: Set<string>;
  statusOverrides: Map<string, { status: string; updatedAt: string }>;
}> {
  const sprintReady = new Set<string>();
  const statusOverrides = new Map<string, { status: string; updatedAt: string }>();

  try {
    // Fetch both sprint and status overrides in one query
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/priority_completions?or=(id.like.sprint:*,id.like.taskstatus:*)&select=id,completed_at`,
      { headers: supabaseHeaders, cache: "no-store" }
    );
    if (!res.ok) return { sprintReady, statusOverrides };
    const rows: { id: string; completed_at: string }[] = await res.json();

    for (const row of rows) {
      if (row.id.startsWith("sprint:")) {
        sprintReady.add(row.id.replace("sprint:", ""));
      } else if (row.id.startsWith("taskstatus:")) {
        // Format: taskstatus:<key>:<status>
        const parts = row.id.split(":");
        if (parts.length >= 3) {
          const taskKey = parts[1];
          const status = parts.slice(2).join(":");
          statusOverrides.set(taskKey, { status, updatedAt: row.completed_at });
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch task overrides:", e);
  }

  return { sprintReady, statusOverrides };
}

// GET /api/tasks - Get tasks with overrides from Supabase
export async function GET(request: NextRequest) {
  try {
    const registry = await loadRegistry();
    const { sprintReady, statusOverrides } = await getTaskOverrides();
    const { searchParams } = new URL(request.url);
    const filterSprintReady = searchParams.get("sprintReady");
    const filterStatus = searchParams.get("status");

    // Merge overrides from Supabase into task data
    let tasks = registry.tasks.map(t => {
      const override = statusOverrides.get(t.key);
      return {
        ...t,
        sprintReady: sprintReady.has(t.key),
        // Apply status override if it exists and is newer than the registry
        ...(override ? {
          status: override.status as Task["status"],
          updatedAt: override.updatedAt,
          completedAt: (override.status === "done" || override.status === "done_but_unverified") 
            ? override.updatedAt : t.completedAt,
        } : {}),
      };
    });

    if (filterSprintReady === "true") {
      tasks = tasks.filter(t => t.sprintReady === true);
    }
    if (filterStatus) {
      tasks = tasks.filter(t => t.status === filterStatus);
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to load tasks:", error);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

// PATCH /api/tasks - Update task fields via Supabase
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskKey, sprintReady, status, priority, resolution } = body;

    if (!taskKey) {
      return NextResponse.json({ error: "taskKey is required" }, { status: 400 });
    }

    // Handle status updates (persisted to Supabase)
    if (status) {
      const validStatuses = ["pending", "in-progress", "done", "done_but_unverified", "approved"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
      }

      // Delete any existing status override for this task
      await fetch(
        `${SUPABASE_URL}/rest/v1/priority_completions?id=like.taskstatus:${encodeURIComponent(taskKey)}:*`,
        { method: "DELETE", headers: supabaseHeaders }
      );

      // Insert new status override: taskstatus:<key>:<status>
      const id = `taskstatus:${taskKey}:${status}`;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/priority_completions`,
        {
          method: "POST",
          headers: { ...supabaseHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            id,
            completed_at: new Date().toISOString(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("Supabase status upsert error:", err);
        return NextResponse.json({ error: "Failed to save status" }, { status: 500 });
      }

      return NextResponse.json({ success: true, taskKey, status });
    }

    // Handle sprint-ready flag
    if (typeof sprintReady === "boolean") {
      const id = `sprint:${taskKey}`;

      if (sprintReady) {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/priority_completions`,
          {
            method: "POST",
            headers: { ...supabaseHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify({
              id,
              completed_at: new Date().toISOString(),
            }),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          console.error("Supabase upsert error:", err);
          return NextResponse.json({ error: "Failed to save sprint-ready flag" }, { status: 500 });
        }

        return NextResponse.json({ success: true, taskKey, sprintReady: true });
      } else {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/priority_completions?id=eq.${encodeURIComponent(id)}`,
          { method: "DELETE", headers: supabaseHeaders }
        );

        if (!res.ok) {
          const err = await res.text();
          console.error("Supabase delete error:", err);
          return NextResponse.json({ error: "Failed to remove sprint-ready flag" }, { status: 500 });
        }

        return NextResponse.json({ success: true, taskKey, sprintReady: false });
      }
    }

    return NextResponse.json({ error: "No valid update fields provided (status, sprintReady)" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
