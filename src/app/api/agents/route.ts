import { NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";

const WORKSPACE = process.env.CLAWD_WORKSPACE || `${process.env.HOME}/clawd`;
const AGENTS_DIR = join(WORKSPACE, "agents");

const ALLOWED_FILES = [
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "AGENTS.md",
  "MEMORY.md",
  "HEARTBEAT.md",
];

// Map directory name → org-chart agent id
const DIR_TO_ID: Record<string, string> = {
  atlas: "cto",
  theo: "coo",
  muse: "cmo",
  venture: "cro",
  pit: "the-pit",
  // All others use dir name as id: forge, pixel, sentinel, scriptbot, echo, builder, scout
};

interface AgentData {
  id: string;
  name: string;
  title: string;
  model: string;
  emoji: string;
  department: string;
  status: string;
  description: string;
  reportsTo: string | null;
  directReports: string[];
  files: string[];
  dirName: string;
}

function parseIdentity(content: string, dirName: string): Omit<AgentData, "files"> {
  const id = DIR_TO_ID[dirName] || dirName;
  const data: Omit<AgentData, "files"> = {
    id,
    name: dirName,
    title: "",
    model: "",
    emoji: "",
    department: "",
    status: "active",
    description: "",
    reportsTo: null,
    directReports: [],
    dirName,
  };

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Match **Key:** Value or - **Key:** Value
    const kvMatch = trimmed.match(/^\*{0,2}-?\s*\*{0,2}\**(\w[\w\s]*):\*{0,2}\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim().toLowerCase();
      const val = kvMatch[2].trim();
      if (key === "name") data.name = val;
      else if (key === "title" || key === "role") data.title = val;
      else if (key === "model") data.model = val;
      else if (key === "emoji") data.emoji = val;
      else if (key === "department") data.department = val;
      else if (key === "status") data.status = val.toLowerCase();
      else if (key === "description") data.description = val;
      else if (key === "reports to") {
        // Store the raw value — could be an id like "coo" or a name like "Theo"
        data.reportsTo = val || null;
      }
      else if (key === "direct reports") {
        // Comma-separated ids
        data.directReports = val ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
      }
    }
  }

  return data;
}

export async function GET() {
  try {
    const entries = await readdir(AGENTS_DIR, { withFileTypes: true });
    const result: Record<string, AgentData> = {};

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip hidden dirs and shared
      if (entry.name.startsWith(".") || entry.name === "shared") continue;

      const agentDir = join(AGENTS_DIR, entry.name);
      const agentId = DIR_TO_ID[entry.name] || entry.name;

      // Read IDENTITY.md if it exists
      let data: Omit<AgentData, "files">;

      try {
        const identityContent = await readFile(
          join(agentDir, "IDENTITY.md"),
          "utf-8"
        );
        data = parseIdentity(identityContent, entry.name);
      } catch {
        // No IDENTITY.md — use defaults
        data = {
          id: agentId,
          name: entry.name,
          title: "",
          model: "",
          emoji: "",
          department: "",
          status: "active",
          description: "",
          reportsTo: null,
          directReports: [],
          dirName: entry.name,
        };
      }

      // List allowed files that exist
      const files: string[] = [];
      for (const f of ALLOWED_FILES) {
        try {
          await stat(join(agentDir, f));
          files.push(f);
        } catch {
          // File doesn't exist
        }
      }

      result[agentId] = { ...data, files };
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list agents", detail: String(error) },
      { status: 500 }
    );
  }
}
