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
  tag: "AGENT" | "JOSHUA";
  priority: "high" | "medium" | "low";
  assignee: string;
  status: "pending" | "in-progress" | "done" | "done_but_unverified" | "resolved";
  sourceStandup: string;
  sourceStandupType: string;
  sourceDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  sprintReady?: boolean;
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

// Fetch sprint-ready flags from Supabase (stored as sprint:<key> in priority_completions)
async function getSprintReadyFlags(): Promise<Set<string>> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/priority_completions?id=like.sprint:*&select=id`,
      { headers: supabaseHeaders, cache: "no-store" }
    );
    if (!res.ok) return new Set();
    const rows = await res.json();
    return new Set(rows.map((r: { id: string }) => r.id.replace("sprint:", "")));
  } catch {
    return new Set();
  }
}

// GET /api/tasks - Get tasks with sprint-ready state from Supabase
export async function GET(request: NextRequest) {
  try {
    const registry = await loadRegistry();
    const sprintFlags = await getSprintReadyFlags();
    const { searchParams } = new URL(request.url);
    const filterSprintReady = searchParams.get("sprintReady");
    const filterStatus = searchParams.get("status");

    // Merge sprint-ready flags from Supabase into task data
    let tasks = registry.tasks.map(t => ({
      ...t,
      sprintReady: sprintFlags.has(t.key),
    }));

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

// PATCH /api/tasks - Update task fields (status, priority, sprint-ready)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskKey, sprintReady, status, priority, resolution } = body;

    if (!taskKey) {
      return NextResponse.json({ error: "taskKey is required" }, { status: 400 });
    }

    // Handle status/priority updates (persisted to task-registry.json)
    if (status || priority || resolution !== undefined) {
      const registry = await loadRegistry();
      const taskIndex = registry.tasks.findIndex(t => t.key === taskKey);
      if (taskIndex === -1) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      const task = registry.tasks[taskIndex];
      const now = new Date().toISOString();

      if (status) {
        const validStatuses = ["pending", "in-progress", "done", "done_but_unverified"];
        if (!validStatuses.includes(status)) {
          return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
        }
        task.status = status;
        task.updatedAt = now;
        if (status === "done" || status === "done_but_unverified") {
          task.completedAt = now;
        } else {
          task.completedAt = null;
        }
      }

      if (priority) {
        const validPriorities = ["high", "medium", "low"];
        if (!validPriorities.includes(priority)) {
          return NextResponse.json({ error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` }, { status: 400 });
        }
        task.priority = priority;
        task.updatedAt = now;
      }

      if (resolution !== undefined) {
        (task as any).resolution = resolution;
        task.updatedAt = now;
      }

      registry.tasks[taskIndex] = task;
      await fs.writeFile(TASK_REGISTRY_PATH, JSON.stringify(registry, null, 2));

      return NextResponse.json({ success: true, task });
    }

    // Handle sprint-ready flag (legacy path)
    if (typeof sprintReady !== "boolean") {
      return NextResponse.json({ error: "No valid update fields provided (status, priority, sprintReady)" }, { status: 400 });
    }

    const id = `sprint:${taskKey}`;

    if (sprintReady) {
      // Upsert sprint flag into Supabase
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
      // Delete sprint flag from Supabase
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
        return NextResponse.json({ error: "Failed to remove sprint-ready flag" }, { status: 500 });
      }

      return NextResponse.json({ success: true, taskKey, sprintReady: false });
    }
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
