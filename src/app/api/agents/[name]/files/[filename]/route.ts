import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const WORKSPACE = process.env.CLAWD_WORKSPACE || `${process.env.HOME}/clawd`;
const AGENTS_DIR = join(WORKSPACE, "agents");

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

  try {
    const filePath = join(AGENTS_DIR, name, filename);
    const content = await readFile(filePath, "utf-8");
    return NextResponse.json({ content, filename });
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

    const filePath = join(AGENTS_DIR, name, filename);
    await writeFile(filePath, content, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to write file", detail: String(error) },
      { status: 500 }
    );
  }
}
