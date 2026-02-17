import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const PRIORITIES_PATH = join(process.cwd(), "public/data/joshua-priorities.json");

function loadPriorities() {
  try {
    const raw = readFileSync(PRIORITIES_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePriorities(data: Record<string, unknown>) {
  writeFileSync(PRIORITIES_PATH, JSON.stringify(data, null, 2));
}

// GET — return current priorities
export async function GET() {
  const data = loadPriorities();
  if (!data) {
    return NextResponse.json({ error: "Priorities file not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

// PATCH — toggle a priority or agent task
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, index, completed } = body;
    // type: "priority" | "agent"
    // index: number (position in array)
    // completed: boolean

    if (!type || index == null || completed == null) {
      return NextResponse.json(
        { error: "Missing required fields: type, index, completed" },
        { status: 400 }
      );
    }

    const data = loadPriorities();
    if (!data) {
      return NextResponse.json({ error: "Priorities file not found" }, { status: 404 });
    }

    if (type === "priority") {
      if (!data.priorities || index >= data.priorities.length) {
        return NextResponse.json({ error: "Invalid priority index" }, { status: 400 });
      }
      data.priorities[index].completed = completed;
      if (completed) {
        data.priorities[index].completedAt = new Date().toISOString();
      } else {
        delete data.priorities[index].completedAt;
      }
    } else if (type === "agent") {
      if (!data.agentHandled || index >= data.agentHandled.length) {
        return NextResponse.json({ error: "Invalid agent task index" }, { status: 400 });
      }
      if (completed) {
        data.agentHandled[index].status = "done";
        data.agentHandled[index].completedAt = new Date().toISOString();
      } else {
        data.agentHandled[index].status = "done_but_unverified";
        delete data.agentHandled[index].completedAt;
      }
    } else {
      return NextResponse.json({ error: "Invalid type: must be 'priority' or 'agent'" }, { status: 400 });
    }

    savePriorities(data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error updating priorities:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
