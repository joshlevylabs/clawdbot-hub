import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PRIORITIES_FILE = path.join(process.cwd(), "public", "data", "joshua-priorities.json");

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

export async function GET() {
  try {
    if (!fs.existsSync(PRIORITIES_FILE)) {
      return NextResponse.json({ error: "Priorities file not found" }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(PRIORITIES_FILE, "utf8"));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading priorities:", error);
    return NextResponse.json({ error: "Failed to load priorities" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { text, completed, completedAt } = await request.json();

    if (!text || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: text and completed" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(PRIORITIES_FILE)) {
      return NextResponse.json({ error: "Priorities file not found" }, { status: 404 });
    }

    const data: JoshuaPriorities = JSON.parse(fs.readFileSync(PRIORITIES_FILE, "utf8"));
    
    // Find the priority by text match
    const priorityIndex = data.priorities.findIndex(p => p.text === text);
    
    if (priorityIndex === -1) {
      return NextResponse.json({ error: "Priority not found" }, { status: 404 });
    }

    // Update the priority
    data.priorities[priorityIndex] = {
      ...data.priorities[priorityIndex],
      completed,
      completedAt: completed ? (completedAt || new Date().toISOString()) : undefined,
    };

    // Write back to file
    fs.writeFileSync(PRIORITIES_FILE, JSON.stringify(data, null, 2));

    return NextResponse.json({ 
      success: true, 
      priority: data.priorities[priorityIndex] 
    });

  } catch (error) {
    console.error("Error updating priority:", error);
    return NextResponse.json({ error: "Failed to update priority" }, { status: 500 });
  }
}