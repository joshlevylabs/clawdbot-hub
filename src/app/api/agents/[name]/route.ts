import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { upsertAgent } from "@/lib/supabase-agents";

const WORKSPACE = process.env.CLAWD_WORKSPACE || `${process.env.HOME}/clawd`;
const AGENTS_DIR = join(WORKSPACE, "agents");

// Map directory name → org-chart agent id
const DIR_TO_ID: Record<string, string> = {
  atlas: "cto",
  theo: "coo",
  muse: "cmo",
  venture: "cro",
  pit: "the-pit",
};

function dirToAgentId(dirName: string): string {
  return DIR_TO_ID[dirName] || dirName;
}

// Validate agent name — alphanumeric, hyphens, underscores only
function isValidName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!isValidName(name)) {
    return NextResponse.json(
      { error: "Invalid agent name" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const {
      id,
      name: newName,
      title,
      model,
      emoji,
      department,
      status,
      description,
      reportsTo,
      directReports,
    } = body as {
      id?: string;
      name?: string;
      title?: string;
      model?: string;
      emoji?: string;
      department?: string;
      status?: string;
      description?: string;
      reportsTo?: string | null;
      directReports?: string[];
    };

    // 1. Persist to Supabase (primary storage)
    // Resolve dir name → agent id (frontend sends dir names like "theo" for COO)
    const agentId = id || dirToAgentId(name);
    const supabaseData: Record<string, unknown> = { id: agentId };

    if (newName !== undefined) supabaseData.name = newName;
    if (title !== undefined) supabaseData.title = title;
    if (model !== undefined) supabaseData.model = model;
    if (emoji !== undefined) supabaseData.emoji = emoji;
    if (department !== undefined) supabaseData.department = department;
    if (status !== undefined) supabaseData.status = status;
    if (description !== undefined) supabaseData.description = description;
    if (reportsTo !== undefined) supabaseData.reports_to = reportsTo;
    if (directReports !== undefined) supabaseData.direct_reports = directReports;

    const supabaseOk = await upsertAgent(
      supabaseData as { id: string } & Record<string, unknown>
    );

    // 2. Also try filesystem write (for local dev — fire and forget)
    try {
      const identityPath = join(AGENTS_DIR, name, "IDENTITY.md");

      let content: string;
      try {
        content = await readFile(identityPath, "utf-8");
      } catch {
        content = `# ${name}\n\n- **Name:** ${name}\n- **Title:** \n- **Model:** \n- **Emoji:** \n- **Department:** \n`;
      }

      const updateField = (c: string, field: string, value: string): string => {
        const regex = new RegExp(
          `(^[-\\s]*\\*{0,2}\\s*\\*{0,2}${field}:\\*{0,2})\\s*.*$`,
          "mi"
        );
        if (regex.test(c)) {
          return c.replace(regex, `$1 ${value}`);
        }
        const headingEnd = c.indexOf("\n") + 1;
        return (
          c.slice(0, headingEnd) +
          `- **${field}:** ${value}\n` +
          c.slice(headingEnd)
        );
      };

      if (newName !== undefined) content = updateField(content, "Name", newName);
      if (title !== undefined) content = updateField(content, "Title", title);
      if (model !== undefined) content = updateField(content, "Model", model);
      if (emoji !== undefined) content = updateField(content, "Emoji", emoji);

      await writeFile(identityPath, content, "utf-8");
    } catch {
      // Filesystem write failed (expected on Vercel) — that's fine if Supabase worked
    }

    if (supabaseOk) {
      return NextResponse.json({ success: true, storage: "supabase" });
    }

    // If Supabase failed too, report error
    return NextResponse.json({ success: false, error: "Both Supabase and filesystem writes failed" }, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update agent", detail: String(error) },
      { status: 500 }
    );
  }
}
