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

interface AgentMeta {
  name: string;
  title: string;
  model: string;
  emoji: string;
  department: string;
  files: string[];
}

function parseIdentity(content: string, dirName: string): Omit<AgentMeta, "files"> {
  const meta: Omit<AgentMeta, "files"> = {
    name: dirName,
    title: "",
    model: "",
    emoji: "",
    department: "",
  };

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Match **Key:** Value or - **Key:** Value
    const kvMatch = trimmed.match(/^\*{0,2}-?\s*\*{0,2}\**(\w[\w\s]*):\*{0,2}\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim().toLowerCase();
      const val = kvMatch[2].trim();
      if (key === "name") meta.name = val;
      else if (key === "title" || key === "role") meta.title = val;
      else if (key === "model") meta.model = val;
      else if (key === "emoji") meta.emoji = val;
      else if (key === "department") meta.department = val;
    }
  }

  return meta;
}

export async function GET() {
  try {
    const entries = await readdir(AGENTS_DIR, { withFileTypes: true });
    const agents: AgentMeta[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip hidden dirs and shared
      if (entry.name.startsWith(".") || entry.name === "shared") continue;

      const agentDir = join(AGENTS_DIR, entry.name);

      // Read IDENTITY.md if it exists
      let meta: Omit<AgentMeta, "files"> = {
        name: entry.name,
        title: "",
        model: "",
        emoji: "",
        department: "",
      };

      try {
        const identityContent = await readFile(
          join(agentDir, "IDENTITY.md"),
          "utf-8"
        );
        meta = parseIdentity(identityContent, entry.name);
      } catch {
        // No IDENTITY.md — use defaults
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

      agents.push({ ...meta, files });
    }

    // Sort alphabetically by name
    agents.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list agents", detail: String(error) },
      { status: 500 }
    );
  }
}
