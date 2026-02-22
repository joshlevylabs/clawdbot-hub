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
  "ai-infra": "aiinfra",
  "consumer-hw": "conshw",
  "robotics": "roboauto",
  "digital-platforms": "digplat",
  "data-integrity": "dataint",
  "automation-tooling": "autotool",
  "compliance": "compstd",
  forge: "nexus",
  "test-arch": "testarch",
  "hw-validation": "hwval",
  "sw-ai-validation": "swval",
  "data-integrity": "dataint",
  "automation-tooling": "autotool",
  compliance: "compstd",
  "faith-family": "faithfam",
  "ai-infra": "aiinfra",
  "consumer-hw": "conshw",
  robotics: "roboauto",
  "digital-platforms": "digplat",
  // All others use dir name as id: pixel, sentinel, scriptbot, echo, builder, scout
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
    { id: "coo", name: "Theo", title: "COO", emoji: "🔺", model: "Claude Opus 4", department: "Executive", status: "active", description: "Orchestrates all operations. The right hand.", reports_to: "ceo", direct_reports: ["cto", "cmo", "cro", "cfto", "ctio", "cpo", "faithfam", "auditor"], files: {} },
    { id: "auditor", name: "Auditor", title: "Task Auditor", emoji: "🔎", model: "Sonnet 4", department: "Executive", status: "active", description: "Verifies agent tasks by checking actual world state. Trust but verify.", reports_to: "coo", direct_reports: [], files: {} },
    { id: "cto", name: "Elon", title: "CTO", emoji: "🗺️", model: "Claude Sonnet 4", department: "Engineering", status: "active", description: "Revolutionary technologist. First principles, vertical integration, moonshot engineering.", reports_to: "coo", direct_reports: ["nexus", "pixel", "sentinel"], files: {} },
    { id: "nexus", name: "Nexus", title: "Backend Lead", emoji: "🔗", model: "Sonnet 4", department: "Engineering", status: "active", description: "APIs, databases, security", reports_to: "cto", direct_reports: [], files: {} },
    { id: "pixel", name: "Pixel", title: "Frontend Lead", emoji: "✨", model: "Sonnet 4", department: "Engineering", status: "idle", description: "UI/UX, CI/CD, deployment", reports_to: "cto", direct_reports: [], files: {} },
    { id: "sentinel", name: "Sentinel", title: "QA Lead", emoji: "🛡️", model: "Haiku 3.5", department: "Engineering", status: "standby", description: "Testing, code review, quality gates", reports_to: "cto", direct_reports: [], files: {} },
    { id: "cmo", name: "Alex", title: "CMO", emoji: "🦍", model: "Claude Sonnet 4", department: "Marketing", status: "active", description: "Content, creative direction, brand. Obsessed with offers, value equations, and volume.", reports_to: "coo", direct_reports: ["scriptbot", "echo"], files: {} },
    { id: "scriptbot", name: "ScriptBot", title: "Content Lead", emoji: "📝", model: "Sonnet 4", department: "Marketing", status: "active", description: "Podcast scripts, newsletter, blog posts", reports_to: "cmo", direct_reports: [], files: {} },
    { id: "echo", name: "Echo", title: "Social Lead", emoji: "📣", model: "Haiku 3.5", department: "Marketing", status: "idle", description: "Social scheduling, engagement, community", reports_to: "cmo", direct_reports: [], files: {} },
    { id: "cro", name: "Dave", title: "CRO", emoji: "💵", model: "Claude Sonnet 4", department: "Revenue", status: "active", description: "Growth strategy, monetization. Gazelle-intense focus on revenue.", reports_to: "coo", direct_reports: ["builder", "scout"], files: {} },
    { id: "builder", name: "Builder", title: "Products Lead", emoji: "🏗️", model: "Sonnet 4", department: "Revenue", status: "active", description: "Product ideation, feature dev, market fit", reports_to: "cro", direct_reports: [], files: {} },
    { id: "scout", name: "Scout", title: "Growth Lead", emoji: "🔍", model: "Haiku 3.5", department: "Revenue", status: "idle", description: "User acquisition, community, analytics", reports_to: "cro", direct_reports: [], files: {} },
    // CFTO — Chris promoted to C-suite
    { id: "cfto", name: "Chris", title: "CFTO", emoji: "📈", model: "Sonnet 4", department: "Revenue", status: "active", description: "Chris Vermeulen — CFTO owning all financial tools and products.", reports_to: "coo", direct_reports: ["quant", "sweep"], files: {} },
    { id: "quant", name: "Quant", title: "Signal Analyst", emoji: "🧮", model: "Sonnet 4", department: "Revenue", status: "active", description: "Signal accuracy analysis, correlation scanning, and regime detection.", reports_to: "cfto", direct_reports: [], files: {} },
    { id: "sweep", name: "Sweep", title: "Backtester", emoji: "🧪", model: "Sonnet 4", department: "Revenue", status: "active", description: "Parameter optimization, backtesting, and regression testing.", reports_to: "cfto", direct_reports: [], files: {} },
    // CTIO — Test Infrastructure
    { id: "ctio", name: "Elon", title: "CTIO", emoji: "🧪", model: "Claude Sonnet 4", department: "Engineering", status: "active", description: "Relentless Systems Verifier. First-principles testing.", reports_to: "coo", direct_reports: ["testarch", "hwval", "swval", "dataint", "autotool", "compstd"], files: {} },
    { id: "testarch", name: "Lamport", title: "VP Test Architecture", emoji: "🏗️", model: "Sonnet 4", department: "Engineering", status: "active", description: "Elegant System Theorist. Traceability matrices, formal correctness.", reports_to: "ctio", direct_reports: [], files: {} },
    { id: "hwval", name: "Deming", title: "Dir. Hardware Validation", emoji: "🔌", model: "Sonnet 4", department: "Engineering", status: "active", description: "Industrial Reliability Master. Burn-in protocols, sigma levels.", reports_to: "ctio", direct_reports: [], files: {} },
    { id: "swval", name: "Russell", title: "Dir. Software & AI Validation", emoji: "🤖", model: "Sonnet 4", department: "Engineering", status: "active", description: "Alignment Guardian. Hallucination scoring, adversarial testing.", reports_to: "ctio", direct_reports: [], files: {} },
    { id: "dataint", name: "Silver", title: "Dir. Data Integrity", emoji: "📊", model: "Sonnet 4", department: "Engineering", status: "active", description: "Measurement Purist. Telemetry, anomaly detection, Bayesian reasoning.", reports_to: "ctio", direct_reports: [], files: {} },
    { id: "autotool", name: "Linus", title: "Dir. Automation & Tooling", emoji: "⚙️", model: "Sonnet 4", department: "Engineering", status: "active", description: "Builder of Builder Tools. Frameworks, pipeline optimization.", reports_to: "ctio", direct_reports: [], files: {} },
    { id: "compstd", name: "Vestager", title: "Dir. Compliance & Standards", emoji: "📜", model: "Sonnet 4", department: "Engineering", status: "active", description: "Institutional Integrity Defender. Regulatory constraints, audit logs.", reports_to: "ctio", direct_reports: [], files: {} },
    // CPO — Product
    { id: "cpo", name: "Jobs", title: "CPO", emoji: "🧭", model: "Claude Sonnet 4", department: "Executive", status: "active", description: "Taste + Vision + Market Timing. Ruthless focus, product intuition.", reports_to: "coo", direct_reports: ["aiinfra", "conshw", "roboauto", "digplat"], files: {} },
    { id: "faithfam", name: "Jordan Peterson", title: "CFFO", emoji: "🕊️", model: "Sonnet 4", department: "Executive", status: "active", description: "Chief Family & Faith Officer. Moral Order + Psychological Responsibility. Ethical product review, family impact, civilizational thinking.", reports_to: "coo", direct_reports: [], files: {} },
    { id: "aiinfra", name: "Hassabis", title: "Dir. AI Infrastructure", emoji: "🧠", model: "Sonnet 4", department: "Engineering", status: "active", description: "Scaling Intelligence Architect. Agent orchestration, capability scaling.", reports_to: "cpo", direct_reports: [], files: {} },
    { id: "conshw", name: "Ive", title: "Dir. Consumer Hardware", emoji: "🔊", model: "Sonnet 4", department: "Engineering", status: "active", description: "Human-Centered Engineer. Obsessive simplicity, emotional design.", reports_to: "cpo", direct_reports: [], files: {} },
    { id: "roboauto", name: "Brooks", title: "Dir. Robotics & Automation", emoji: "🤖", model: "Sonnet 4", department: "Engineering", status: "active", description: "Applied Robotics Visionary. Behavior-based, practical autonomy.", reports_to: "cpo", direct_reports: [], files: {} },
    { id: "digplat", name: "Bezos", title: "Dir. Digital Platforms", emoji: "🌐", model: "Sonnet 4", department: "Engineering", status: "active", description: "Platform Ecosystem Builder. APIs, marketplace flywheels, scaling.", reports_to: "cpo", direct_reports: [], files: {} },
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
