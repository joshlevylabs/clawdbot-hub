import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { getAgentFile, updateAgentFile } from "@/lib/supabase-agents";

const WORKSPACE = process.env.CLAWD_WORKSPACE || `${process.env.HOME}/clawd`;
const AGENTS_DIR = join(WORKSPACE, "agents");

// Map directory name → org-chart agent id (used for Supabase lookups)
const DIR_TO_ID: Record<string, string> = {
  atlas: "cto",
  theo: "coo",
  muse: "cmo",
  venture: "cro",
  pit: "ticker",
};

function dirToAgentId(dirName: string): string {
  return DIR_TO_ID[dirName] || dirName;
}

const ALLOWED_FILES = new Set([
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "AGENTS.md",
  "MEMORY.md",
  "HEARTBEAT.md",
]);

// Validate agent name — alphanumeric, hyphens, underscores only
function isValidName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

// Validate filename — must be in allowlist, no path traversal
function isValidFilename(filename: string): boolean {
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return false;
  }
  return ALLOWED_FILES.has(filename);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string; filename: string }> }
) {
  const { name, filename } = await params;

  if (!isValidName(name)) {
    return NextResponse.json({ error: "Invalid agent name" }, { status: 400 });
  }
  if (!isValidFilename(filename)) {
    return NextResponse.json(
      { error: "Invalid or disallowed filename" },
      { status: 400 }
    );
  }

  // 1. Try Supabase first (resolve dir name → agent id)
  const agentId = dirToAgentId(name);
  const supabaseContent = await getAgentFile(agentId, filename);
  if (supabaseContent !== null) {
    return NextResponse.json({ content: supabaseContent, filename, source: "supabase" });
  }

  // 2. Fall back to filesystem
  try {
    const filePath = join(AGENTS_DIR, name, filename);
    const content = await readFile(filePath, "utf-8");
    return NextResponse.json({ content, filename, source: "filesystem" });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return NextResponse.json(
        { error: "File not found", filename },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to read file", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; filename: string }> }
) {
  const { name, filename } = await params;

  if (!isValidName(name)) {
    return NextResponse.json({ error: "Invalid agent name" }, { status: 400 });
  }
  if (!isValidFilename(filename)) {
    return NextResponse.json(
      { error: "Invalid or disallowed filename" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { content } = body as { content: string };

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string" },
        { status: 400 }
      );
    }

    // 1. Persist to Supabase (primary storage, resolve dir name → agent id)
    const agentId = dirToAgentId(name);
    const supabaseOk = await updateAgentFile(agentId, filename, content);

    // 2. Also try filesystem write (local dev fallback)
    let fsOk = false;
    try {
      const filePath = join(AGENTS_DIR, name, filename);
      await writeFile(filePath, content, "utf-8");
      fsOk = true;
    } catch {
      // Expected to fail on Vercel — that's fine if Supabase worked
    }

    if (supabaseOk) {
      return NextResponse.json({ success: true, storage: "supabase" });
    }

    if (fsOk) {
      return NextResponse.json({ success: true, storage: "filesystem" });
    }

    return NextResponse.json(
      { error: "Both Supabase and filesystem writes failed" },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to write file", detail: String(error) },
      { status: 500 }
    );
  }
}
