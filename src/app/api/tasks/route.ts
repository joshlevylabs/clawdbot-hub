import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const TASK_REGISTRY_PATH = path.join(process.cwd(), "public", "data", "standups", "task-registry.json");

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

async function saveRegistry(registry: TaskRegistry) {
  await fs.writeFile(TASK_REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

// GET /api/tasks - Get all tasks (or filter by query params)
export async function GET(request: NextRequest) {
  try {
    const registry = await loadRegistry();
    const { searchParams } = new URL(request.url);
    const sprintReady = searchParams.get("sprintReady");
    const status = searchParams.get("status");

    let tasks = registry.tasks;

    if (sprintReady === "true") {
      tasks = tasks.filter(t => t.sprintReady === true);
    }
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to load tasks:", error);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

// PATCH /api/tasks - Update a specific task by key
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskKey, ...updates } = body;

    if (!taskKey) {
      return NextResponse.json({ error: "taskKey is required" }, { status: 400 });
    }

    // Whitelist of allowed fields to update
    const allowedFields = ["sprintReady", "status", "priority", "completedAt"];
    const filteredUpdates: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const registry = await loadRegistry();
    const taskIndex = registry.tasks.findIndex(t => t.key === taskKey);

    if (taskIndex === -1) {
      return NextResponse.json({ error: `Task ${taskKey} not found` }, { status: 404 });
    }

    // Apply updates
    registry.tasks[taskIndex] = {
      ...registry.tasks[taskIndex],
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
    };

    await saveRegistry(registry);

    return NextResponse.json({
      success: true,
      task: registry.tasks[taskIndex],
    });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
