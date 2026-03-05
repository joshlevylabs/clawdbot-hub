import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export const dynamic = 'force-dynamic';
import { upsertAgent } from "@/lib/supabase-agents";
import { supabase } from "@/lib/supabase";

const WORKSPACE = process.env.CLAWD_WORKSPACE || `${process.env.HOME}/clawd`;
const AGENTS_DIR = join(WORKSPACE, "agents");

// Map directory name → org-chart agent id
const DIR_TO_ID: Record<string, string> = {
  atlas: "cto",
  theo: "coo",
  muse: "cmo",
  venture: "cro",
  pit: "the-pit",
  "faith-family": "faithfam",
  "ai-infra": "aiinfra",
  "consumer-hw": "conshw",
  "robotics": "roboauto",
  "digital-platforms": "digplat",
  "data-integrity": "dataint",
  "automation-tooling": "autotool",
  "compliance": "compstd",
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

// GET: Return agent config (public fields only) - for Agent Runtime API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const agentId = name;

    const { data: agentConfig, error } = await supabase
      .from('agent_configs')
      .select(`
        id,
        name,
        title,
        emoji,
        model,
        department,
        status,
        description,
        reports_to,
        direct_reports,
        temperature,
        max_tokens,
        knowledge_sources,
        integrations,
        endpoint_enabled,
        updated_at
      `)
      .eq('id', agentId)
      .single();

    if (error || !agentConfig) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    return NextResponse.json(agentConfig);

  } catch (err) {
    console.error("Get agent config error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Update agent config fields - for Agent Runtime API
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const agentId = name;
    const body = await request.json();

    // Define allowed fields for updating
    const allowedFields = [
      'soul_prompt',
      'temperature',
      'max_tokens',
      'knowledge_sources',
      'integrations',
      'endpoint_enabled',
      'name',
      'title',
      'description',
      'model'
    ];

    // Filter body to only allowed fields
    const updateData: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    // Validate some fields
    if (updateData.temperature !== undefined) {
      if (typeof updateData.temperature !== 'number' || updateData.temperature < 0 || updateData.temperature > 2) {
        return NextResponse.json(
          { error: "Temperature must be a number between 0 and 2" },
          { status: 400 }
        );
      }
    }

    if (updateData.max_tokens !== undefined) {
      if (typeof updateData.max_tokens !== 'number' || updateData.max_tokens < 1 || updateData.max_tokens > 8192) {
        return NextResponse.json(
          { error: "max_tokens must be a number between 1 and 8192" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Check if agent exists
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agent_configs')
      .select('id')
      .eq('id', agentId)
      .single();

    if (fetchError || !existingAgent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    // Update the agent config
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agent_configs')
      .update(updateData)
      .eq('id', agentId)
      .select(`
        id,
        name,
        title,
        emoji,
        model,
        department,
        status,
        description,
        reports_to,
        direct_reports,
        temperature,
        max_tokens,
        knowledge_sources,
        integrations,
        endpoint_enabled,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error("Update agent config error:", updateError);
      return NextResponse.json(
        { error: "Failed to update agent config" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedAgent);

  } catch (err) {
    console.error("Update agent config error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
