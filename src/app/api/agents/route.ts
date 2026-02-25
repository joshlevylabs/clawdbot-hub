import { NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { getAllAgents, upsertAgents, type AgentRow } from "@/lib/supabase-agents";

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
  pit: "cfto",
  "faith-family": "faithfam",
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
        data.reportsTo = val || null;
      }
      else if (key === "direct reports") {
        data.directReports = val ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
      }
    }
  }

  return data;
}

// Default agents for seeding — matches getDefaultAgents() in org-chart page
function getDefaultAgentSeeds(): (Partial<AgentRow> & { id: string })[] {
  return [
    { id: "ceo", name: "Joshua", title: "CEO", emoji: "👑", model: "Human", department: "Executive", status: "active", description: "Sets the vision. The builder.", reports_to: null, direct_reports: ["coo"], files: {} },
    { id: "coo", name: "Theo", title: "COO", emoji: "🔺", model: "Claude Opus 4", department: "Executive", status: "active", description: "Orchestrates all operations. The right hand. Spawns sub-agents dynamically as needed.", reports_to: "ceo", direct_reports: ["cto", "cmo", "cro", "cfto", "ctio", "cpo", "faithfam"], files: {} },
    { id: "cto", name: "Elon", title: "CTO", emoji: "🗺️", model: "Claude Sonnet 4", department: "Engineering", status: "active", description: "Revolutionary technologist. First principles, vertical integration, moonshot engineering. Spawns specialist agents on demand.", reports_to: "coo", direct_reports: [], files: {} },
    { id: "cmo", name: "Alex", title: "CMO", emoji: "🦍", model: "Claude Sonnet 4", department: "Marketing", status: "active", description: "Content, creative direction, brand. Obsessed with offers, value equations, and volume. Spawns content/social agents as needed.", reports_to: "coo", direct_reports: [], files: {} },
    { id: "cro", name: "Dave", title: "CRO", emoji: "💵", model: "Claude Sonnet 4", department: "Revenue", status: "active", description: "Growth strategy, monetization. Gazelle-intense focus on revenue.", reports_to: "coo", direct_reports: [], files: {} },
    { id: "cfto", name: "Chris", title: "CFTO", emoji: "📈", model: "Claude Sonnet 4", department: "Revenue", status: "active", description: "Chris Vermeulen — CFTO owning all financial tools and products.", reports_to: "coo", direct_reports: [], files: {} },
    { id: "ctio", name: "James Truchard", title: "CTIO", emoji: "⚡", model: "Claude Sonnet 4", department: "Engineering", status: "active", description: "Visionary engineer and co-founder mindset. Drives breakthrough instrumentation and measurement innovation with relentless technical excellence.", reports_to: "coo", direct_reports: [], files: {} },
    { id: "cpo", name: "Jobs", title: "CPO", emoji: "🧭", model: "Claude Sonnet 4", department: "Executive", status: "active", description: "Taste + Vision + Market Timing. Ruthless focus, product intuition.", reports_to: "coo", direct_reports: [], files: {} },
    { id: "faithfam", name: "Jordan Peterson", title: "CFFO", emoji: "🕊️", model: "Claude Sonnet 4", department: "Executive", status: "active", description: "Chief Family & Faith Officer. Moral Order + Psychological Responsibility. Ethical product review, family impact, civilizational thinking.", reports_to: "coo", direct_reports: [], files: {} },
  ];
}

/**
 * Convert a Supabase AgentRow to the API response format expected by the frontend
 */
function rowToApiAgent(row: AgentRow): AgentData {
  return {
    id: row.id,
    name: row.name,
    title: row.title || "",
    model: row.model || "",
    emoji: row.emoji || "",
    department: row.department || "",
    status: row.status || "standby",
    description: row.description || "",
    reportsTo: row.reports_to,
    directReports: row.direct_reports || [],
    files: Object.keys(row.files || {}),
    dirName: row.id,
  };
}

export async function GET() {
  // Strategy: Try Supabase first, fall back to filesystem

  // 1. Try Supabase
  const supabaseAgents = await getAllAgents();

  if (supabaseAgents && Object.keys(supabaseAgents).length > 0) {
    // Convert rows to API format
    const result: Record<string, AgentData> = {};
    for (const [id, row] of Object.entries(supabaseAgents)) {
      result[id] = rowToApiAgent(row);
    }
    return NextResponse.json(result);
  }

  // 2. If Supabase returned empty results (table exists but no data), seed it
  if (supabaseAgents !== null && Object.keys(supabaseAgents).length === 0) {
    const seeds = getDefaultAgentSeeds();
    const seeded = await upsertAgents(seeds);
    if (seeded) {
      // Re-fetch after seeding
      const freshAgents = await getAllAgents();
      if (freshAgents && Object.keys(freshAgents).length > 0) {
        const result: Record<string, AgentData> = {};
        for (const [id, row] of Object.entries(freshAgents)) {
          result[id] = rowToApiAgent(row);
        }
        return NextResponse.json(result);
      }
    }
  }

  // 3. Fall back to filesystem (local dev)
  try {
    const entries = await readdir(AGENTS_DIR, { withFileTypes: true });
    const result: Record<string, AgentData> = {};

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "shared") continue;

      const agentDir = join(AGENTS_DIR, entry.name);
      const agentId = DIR_TO_ID[entry.name] || entry.name;

      let data: Omit<AgentData, "files">;
      try {
        const identityContent = await readFile(join(agentDir, "IDENTITY.md"), "utf-8");
        data = parseIdentity(identityContent, entry.name);
      } catch {
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

      const files: string[] = [];
      for (const f of ALLOWED_FILES) {
        try {
          await stat(join(agentDir, f));
          files.push(f);
        } catch { /* File doesn't exist */ }
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
