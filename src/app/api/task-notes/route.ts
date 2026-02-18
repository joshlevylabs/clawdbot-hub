import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const TASK_NOTES_PATH = path.join(process.cwd(), "public", "data", "standups", "task-notes.json");

interface TaskNotes {
  [taskKey: string]: {
    description?: string;
    acceptanceCriteria?: { text: string; completed: boolean }[];
    sprintNotes?: string;
  };
}

// Ensure directory exists
async function ensureDirectoryExists() {
  const dir = path.dirname(TASK_NOTES_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Load existing task notes
async function loadTaskNotes(): Promise<TaskNotes> {
  try {
    await ensureDirectoryExists();
    const data = await fs.readFile(TASK_NOTES_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty object
    return {};
  }
}

// Save task notes
async function saveTaskNotes(notes: TaskNotes) {
  await ensureDirectoryExists();
  await fs.writeFile(TASK_NOTES_PATH, JSON.stringify(notes, null, 2), "utf8");
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
    const { taskKey, description, acceptanceCriteria, sprintNotes } = body;

    if (!taskKey) {
      return NextResponse.json({ error: "Task key is required" }, { status: 400 });
    }

    const notes = await loadTaskNotes();
    
    // Update the notes for this task
    if (!notes[taskKey]) {
      notes[taskKey] = {};
    }

    if (description !== undefined) {
      notes[taskKey].description = description;
    }
    
    if (acceptanceCriteria !== undefined) {
      notes[taskKey].acceptanceCriteria = acceptanceCriteria;
    }
    
    if (sprintNotes !== undefined) {
      notes[taskKey].sprintNotes = sprintNotes;
    }

    await saveTaskNotes(notes);
    
    return NextResponse.json({ 
      success: true, 
      taskNotes: notes[taskKey] 
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
    const notes = await loadTaskNotes();
    
    // Merge the provided updates
    Object.keys(body).forEach(taskKey => {
      if (!notes[taskKey]) {
        notes[taskKey] = {};
      }
      notes[taskKey] = { ...notes[taskKey], ...body[taskKey] };
    });

    await saveTaskNotes(notes);
    
    return NextResponse.json({ 
      success: true,
      updated: Object.keys(body).length
    });
  } catch (error) {
    console.error("Failed to batch update task notes:", error);
    return NextResponse.json({ error: "Failed to batch update task notes" }, { status: 500 });
  }
}