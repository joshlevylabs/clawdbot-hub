import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const TASK_NOTES_PATH = path.join(process.cwd(), "public", "data", "standups", "task-notes.json");
const SUPABASE_URL = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PAPER_SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

interface TaskNote {
  description?: string;
  acceptanceCriteria?: { text: string; completed: boolean }[];
  sprintNotes?: string;
  resolution?: string;
  verify?: string;
}

interface TaskNotes {
  [taskKey: string]: TaskNote;
}

// Encode/decode helpers for storing text in the id field
// Format: tasknotedata:<taskKey>:<field>:<base64data>
function encodeNoteId(taskKey: string, field: string, value: string): string {
  const b64 = Buffer.from(value, "utf8").toString("base64");
  return `tasknotedata:${taskKey}:${field}:${b64}`;
}

function decodeNoteId(id: string): { taskKey: string; field: string; value: string } | null {
  const prefix = "tasknotedata:";
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length);
  const colonIdx1 = rest.indexOf(":");
  if (colonIdx1 === -1) return null;
  const taskKey = rest.slice(0, colonIdx1);
  const afterKey = rest.slice(colonIdx1 + 1);
  const colonIdx2 = afterKey.indexOf(":");
  if (colonIdx2 === -1) return null;
  const field = afterKey.slice(0, colonIdx2);
  const b64 = afterKey.slice(colonIdx2 + 1);
  try {
    const value = Buffer.from(b64, "base64").toString("utf8");
    return { taskKey, field, value };
  } catch {
    return null;
  }
}

// Load all task notes from Supabase, fallback to static file
async function loadTaskNotes(): Promise<TaskNotes> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/priority_completions?id=like.tasknotedata:*&select=id`,
      { headers: supabaseHeaders, cache: "no-store" }
    );
    if (res.ok) {
      const rows: { id: string }[] = await res.json();
      if (rows.length > 0) {
        const notes: TaskNotes = {};
        for (const row of rows) {
          const decoded = decodeNoteId(row.id);
          if (!decoded) continue;
          const { taskKey, field, value } = decoded;
          if (!notes[taskKey]) notes[taskKey] = {};

          if (field === "description") {
            notes[taskKey].description = value;
          } else if (field === "sprintNotes") {
            notes[taskKey].sprintNotes = value;
          } else if (field === "resolution") {
            notes[taskKey].resolution = value;
          } else if (field === "verify") {
            notes[taskKey].verify = value;
          } else if (field === "acceptanceCriteria") {
            try {
              notes[taskKey].acceptanceCriteria = JSON.parse(value);
            } catch {
              notes[taskKey].acceptanceCriteria = [];
            }
          }
        }
        return notes;
      }
    }
  } catch (e) {
    console.error("Failed to load task notes from Supabase:", e);
  }

  // Fallback to static file (for dev / initial migration)
  try {
    const data = await fs.readFile(TASK_NOTES_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save a single field for a task to Supabase
async function saveNoteField(taskKey: string, field: string, value: string): Promise<boolean> {
  try {
    // First delete any existing row for this field (id changes with value)
    await fetch(
      `${SUPABASE_URL}/rest/v1/priority_completions?id=like.tasknotedata:${encodeURIComponent(taskKey)}:${encodeURIComponent(field)}:*`,
      { method: "DELETE", headers: supabaseHeaders }
    );

    // Insert new row with encoded value
    const id = encodeNoteId(taskKey, field, value);
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
      console.error(`Supabase upsert error for ${taskKey}.${field}:`, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`Failed to save note field ${taskKey}.${field}:`, e);
    return false;
  }
}

// Save task note to Supabase
async function saveTaskNote(taskKey: string, note: TaskNote): Promise<boolean> {
  const results: boolean[] = [];

  if (note.description !== undefined) {
    results.push(await saveNoteField(taskKey, "description", note.description));
  }
  if (note.sprintNotes !== undefined) {
    results.push(await saveNoteField(taskKey, "sprintNotes", note.sprintNotes));
  }
  if (note.resolution !== undefined) {
    results.push(await saveNoteField(taskKey, "resolution", note.resolution));
  }
  if (note.verify !== undefined) {
    results.push(await saveNoteField(taskKey, "verify", note.verify));
  }
  if (note.acceptanceCriteria !== undefined) {
    results.push(await saveNoteField(taskKey, "acceptanceCriteria", JSON.stringify(note.acceptanceCriteria)));
  }

  return results.every(r => r);
}

// GET /api/task-notes - Get all task notes
export async function GET() {
  try {
    const notes = await loadTaskNotes();
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Failed to load task notes:", error);
    return NextResponse.json({ error: "Failed to load task notes" }, { status: 500 });
  }
}

// POST /api/task-notes - Update task notes for a specific task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskKey, description, acceptanceCriteria, sprintNotes, resolution, verify } = body;

    if (!taskKey) {
      return NextResponse.json({ error: "Task key is required" }, { status: 400 });
    }

    const noteUpdate: TaskNote = {};
    if (description !== undefined) noteUpdate.description = description;
    if (acceptanceCriteria !== undefined) noteUpdate.acceptanceCriteria = acceptanceCriteria;
    if (sprintNotes !== undefined) noteUpdate.sprintNotes = sprintNotes;
    if (resolution !== undefined) noteUpdate.resolution = resolution;
    if (verify !== undefined) noteUpdate.verify = verify;

    const success = await saveTaskNote(taskKey, noteUpdate);

    if (!success) {
      return NextResponse.json({ error: "Failed to save task notes" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      taskNotes: noteUpdate,
    });
  } catch (error) {
    console.error("Failed to save task notes:", error);
    return NextResponse.json({ error: "Failed to save task notes" }, { status: 500 });
  }
}

// PUT /api/task-notes - Batch update multiple tasks
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    let successCount = 0;
    for (const taskKey of Object.keys(body)) {
      const success = await saveTaskNote(taskKey, body[taskKey]);
      if (success) successCount++;
    }

    return NextResponse.json({
      success: true,
      updated: successCount,
    });
  } catch (error) {
    console.error("Failed to batch update task notes:", error);
    return NextResponse.json({ error: "Failed to batch update task notes" }, { status: 500 });
  }
}
