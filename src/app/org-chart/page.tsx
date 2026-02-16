"use client";

import {
  Zap,
  Bot,
  Shield,
  Palette,
  DollarSign,
  Code,
  Layout,
  TestTube,
  FileText,
  Share2,
  Rocket,
  Search,
  BarChart3,
  Network,
  ChevronDown,
  ChevronRight,
  Timer,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type Status = "active" | "idle" | "standby";
type Department = "ceo" | "coo" | "cto" | "cmo" | "cro";

interface Agent {
  id: string;
  name: string;
  title: string;
  description: string;
  model: string;
  status: Status;
  icon: ReactNode;
  department: Department;
  children?: Agent[];
}

/* ═══════════════════════════════════════════════════════════════
   Theme constants
   ═══════════════════════════════════════════════════════════════ */

const DEPT_COLORS: Record<Department, {
  accent: string;       // tailwind text color class
  accentHex: string;    // hex for SVG lines
  border: string;
  bg: string;
  glow: string;
  badge: string;
  iconBg: string;
  line: string;
}> = {
  ceo: {
    accent: "text-amber-400",
    accentHex: "#fbbf24",
    border: "border-amber-500/30",
    bg: "bg-gradient-to-br from-amber-950/50 via-amber-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(251,191,36,0.15)]",
    badge: "bg-amber-900/50 text-amber-300 border-amber-700/40",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    line: "stroke-amber-500/40",
  },
  coo: {
    accent: "text-violet-400",
    accentHex: "#a78bfa",
    border: "border-violet-500/30",
    bg: "bg-gradient-to-br from-violet-950/50 via-violet-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(167,139,250,0.15)]",
    badge: "bg-violet-900/50 text-violet-300 border-violet-700/40",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    line: "stroke-violet-500/40",
  },
  cto: {
    accent: "text-cyan-400",
    accentHex: "#22d3ee",
    border: "border-cyan-500/30",
    bg: "bg-gradient-to-br from-cyan-950/50 via-cyan-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(34,211,238,0.15)]",
    badge: "bg-cyan-900/50 text-cyan-300 border-cyan-700/40",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    line: "stroke-cyan-500/40",
  },
  cmo: {
    accent: "text-rose-400",
    accentHex: "#fb7185",
    border: "border-rose-500/30",
    bg: "bg-gradient-to-br from-rose-950/50 via-rose-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(251,113,133,0.15)]",
    badge: "bg-rose-900/50 text-rose-300 border-rose-700/40",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    line: "stroke-rose-500/40",
  },
  cro: {
    accent: "text-emerald-400",
    accentHex: "#34d399",
    border: "border-emerald-500/30",
    bg: "bg-gradient-to-br from-emerald-950/50 via-emerald-900/20 to-slate-900/90",
    glow: "shadow-[0_0_30px_-5px_rgba(52,211,153,0.15)]",
    badge: "bg-emerald-900/50 text-emerald-300 border-emerald-700/40",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    line: "stroke-emerald-500/40",
  },
};

const STATUS_CONFIG: Record<Status, { color: string; ring: string; label: string; pulse: boolean }> = {
  active:  { color: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Active",  pulse: true  },
  idle:    { color: "bg-amber-500",   ring: "ring-amber-500/30",   label: "Idle",    pulse: false },
  standby: { color: "bg-slate-500",   ring: "ring-slate-500/30",   label: "Standby", pulse: false },
};

/* ═══════════════════════════════════════════════════════════════
   Org Data
   ═══════════════════════════════════════════════════════════════ */

const ICON_SIZE_CL = "w-6 h-6";
const ICON_SIZE_TL = "w-5 h-5";

const orgTree: Agent = {
  id: "ceo",
  name: "Joshua",
  title: "CEO",
  description: "Sets the vision. The builder.",
  model: "Human",
  status: "active",
  icon: <Zap className={`${ICON_SIZE_CL} text-amber-400`} />,
  department: "ceo",
  children: [
    {
      id: "coo",
      name: "Theo",
      title: "COO",
      description: "Orchestrates all operations. The right hand.",
      model: "Claude Opus 4",
      status: "active",
      icon: <Bot className={`${ICON_SIZE_CL} text-violet-400`} />,
      department: "coo",
      children: [
        {
          id: "cto",
          name: "Atlas",
          title: "CTO",
          description: "Owns all code and infrastructure.",
          model: "Claude Sonnet 4",
          status: "active",
          icon: <Shield className={`${ICON_SIZE_CL} text-cyan-400`} />,
          department: "cto",
          children: [
            {
              id: "forge",
              name: "Forge",
              title: "Backend Lead",
              description: "APIs, databases, security",
              model: "Sonnet 4",
              status: "active",
              icon: <Code className={`${ICON_SIZE_TL} text-cyan-400`} />,
              department: "cto",
            },
            {
              id: "pixel",
              name: "Pixel",
              title: "Frontend Lead",
              description: "UI/UX, CI/CD, deployment",
              model: "Sonnet 4",
              status: "idle",
              icon: <Layout className={`${ICON_SIZE_TL} text-cyan-400`} />,
              department: "cto",
            },
            {
              id: "sentinel",
              name: "Sentinel",
              title: "QA Lead",
              description: "Testing, code review, quality gates",
              model: "Haiku 3.5",
              status: "standby",
              icon: <TestTube className={`${ICON_SIZE_TL} text-cyan-400`} />,
              department: "cto",
            },
          ],
        },
        {
          id: "cmo",
          name: "Muse",
          title: "CMO",
          description: "Content, creative direction, brand.",
          model: "Claude Sonnet 4",
          status: "active",
          icon: <Palette className={`${ICON_SIZE_CL} text-rose-400`} />,
          department: "cmo",
          children: [
            {
              id: "scriptbot",
              name: "ScriptBot",
              title: "Content Lead",
              description: "Podcast scripts, newsletter, blog posts",
              model: "Sonnet 4",
              status: "active",
              icon: <FileText className={`${ICON_SIZE_TL} text-rose-400`} />,
              department: "cmo",
            },
            {
              id: "echo",
              name: "Echo",
              title: "Social Lead",
              description: "Social scheduling, engagement, community",
              model: "Haiku 3.5",
              status: "idle",
              icon: <Share2 className={`${ICON_SIZE_TL} text-rose-400`} />,
              department: "cmo",
            },
          ],
        },
        {
          id: "cro",
          name: "Venture",
          title: "CRO",
          description: "Growth strategy, monetization.",
          model: "Claude Sonnet 4",
          status: "active",
          icon: <DollarSign className={`${ICON_SIZE_CL} text-emerald-400`} />,
          department: "cro",
          children: [
            {
              id: "builder",
              name: "Builder",
              title: "Products Lead",
              description: "Product ideation, feature dev, market fit",
              model: "Sonnet 4",
              status: "active",
              icon: <Rocket className={`${ICON_SIZE_TL} text-emerald-400`} />,
              department: "cro",
            },
            {
              id: "scout",
              name: "Scout",
              title: "Growth Lead",
              description: "User acquisition, community, analytics",
              model: "Haiku 3.5",
              status: "idle",
              icon: <Search className={`${ICON_SIZE_TL} text-emerald-400`} />,
              department: "cro",
            },
            {
              id: "pit",
              name: "The Pit",
              title: "Trading Lead",
              description: "MRE pipeline, nightly optimization, signals",
              model: "Sonnet 4",
              status: "active",
              icon: <BarChart3 className={`${ICON_SIZE_TL} text-emerald-400`} />,
              department: "cro",
            },
          ],
        },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   Helper: Model Badge
   ═══════════════════════════════════════════════════════════════ */

function ModelBadge({ model }: { model: string }) {
  let classes = "bg-slate-800/60 text-slate-300 border-slate-700/50";
  if (model === "Human")
    classes = "bg-amber-900/40 text-amber-300 border-amber-700/40";
  else if (model.includes("Opus"))
    classes = "bg-violet-900/40 text-violet-300 border-violet-700/40";
  else if (model.includes("Sonnet"))
    classes = "bg-blue-900/40 text-blue-300 border-blue-700/40";
  else if (model.includes("Haiku"))
    classes = "bg-teal-900/40 text-teal-300 border-teal-700/40";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide border ${classes}`}
    >
      {model}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Helper: Status Dot
   ═══════════════════════════════════════════════════════════════ */

function StatusDot({ status, size = "sm" }: { status: Status; size?: "sm" | "md" }) {
  const cfg = STATUS_CONFIG[status];
  const sz = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  return (
    <span className="relative inline-flex">
      {cfg.pulse && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-40 animate-ping`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${sz} ${cfg.color} ring-2 ${cfg.ring}`} />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Card Components
   ═══════════════════════════════════════════════════════════════ */

function ExecutiveCard({ agent }: { agent: Agent }) {
  const dept = DEPT_COLORS[agent.department];
  return (
    <div
      className={`relative rounded-2xl border ${dept.border} ${dept.bg} ${dept.glow} p-6 transition-all duration-300 hover:scale-[1.01]`}
    >
      {/* Subtle top accent line */}
      <div
        className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent ${dept.accent.replace("text-", "via-")} to-transparent opacity-40`}
      />
      <div className="flex items-start gap-4">
        <div className={`shrink-0 p-3 rounded-xl border ${dept.iconBg}`}>
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-lg text-slate-100 tracking-tight">
              {agent.name}
            </h3>
            <span className={`text-sm font-semibold ${dept.accent}`}>
              {agent.title}
            </span>
            <StatusDot status={agent.status} size="md" />
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            {agent.description}
          </p>
          <ModelBadge model={agent.model} />
        </div>
      </div>
    </div>
  );
}

function TeamLeadCard({ agent }: { agent: Agent }) {
  const dept = DEPT_COLORS[agent.department];
  return (
    <div
      className={`relative rounded-xl border border-slate-800/60 bg-slate-900/80 backdrop-blur-sm p-4 transition-all duration-200 hover:border-slate-700/80 hover:bg-slate-900/90 group`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 p-2 rounded-lg border ${dept.iconBg}`}>
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-semibold text-sm text-slate-200">{agent.name}</h4>
            <StatusDot status={agent.status} />
          </div>
          <p className={`text-xs font-medium ${dept.accent} opacity-80 mb-1`}>
            {agent.title}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mb-2">
            {agent.description}
          </p>
          <ModelBadge model={agent.model} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SVG Connector Lines — drawn dynamically via DOM measurement
   ═══════════════════════════════════════════════════════════════ */

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

function ConnectorOverlay({ lines }: { lines: LineSegment[] }) {
  if (lines.length === 0) return null;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Glow filter for lines */}
        <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map((seg, i) => (
        <g key={i}>
          {/* Background glow line */}
          <line
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={seg.color}
            strokeWidth="2"
            opacity="0.15"
            filter="url(#line-glow)"
          />
          {/* Main line */}
          <line
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={seg.color}
            strokeWidth="1.5"
            opacity="0.35"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Desktop Tree Layout
   ═══════════════════════════════════════════════════════════════ */

function DesktopTree() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineSegment[]>([]);

  const computeLines = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const newLines: LineSegment[] = [];

    // Helper: get element center-bottom / center-top relative to container
    const getAnchor = (el: Element, position: "bottom" | "top") => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - rootRect.left,
        y: position === "bottom" ? r.bottom - rootRect.top : r.top - rootRect.top,
      };
    };

    // Draw connections for parent → children
    const connect = (parentId: string, childIds: string[], color: string) => {
      const parentEl = root.querySelector(`[data-node="${parentId}"]`);
      if (!parentEl) return;
      const parentAnchor = getAnchor(parentEl, "bottom");

      const childAnchors = childIds
        .map((id) => {
          const el = root.querySelector(`[data-node="${id}"]`);
          if (!el) return null;
          return getAnchor(el, "top");
        })
        .filter(Boolean) as { x: number; y: number }[];

      if (childAnchors.length === 0) return;

      // Vertical line down from parent
      const midY = parentAnchor.y + (childAnchors[0].y - parentAnchor.y) / 2;

      // Parent → midpoint
      newLines.push({ x1: parentAnchor.x, y1: parentAnchor.y, x2: parentAnchor.x, y2: midY, color });

      if (childAnchors.length === 1) {
        // Single child: straight line down
        newLines.push({
          x1: parentAnchor.x,
          y1: midY,
          x2: childAnchors[0].x,
          y2: childAnchors[0].y,
          color,
        });
      } else {
        // Multiple children: horizontal bar + verticals
        const leftX = Math.min(...childAnchors.map((a) => a.x));
        const rightX = Math.max(...childAnchors.map((a) => a.x));

        // Horizontal bar
        newLines.push({ x1: leftX, y1: midY, x2: rightX, y2: midY, color });

        // Parent down to bar
        // (already drawn above from parentAnchor to midY)

        // Bar down to each child
        for (const child of childAnchors) {
          newLines.push({ x1: child.x, y1: midY, x2: child.x, y2: child.y, color });
        }
      }
    };

    // CEO → COO
    connect("ceo", ["coo"], DEPT_COLORS.ceo.accentHex);
    // COO → CTO, CMO, CRO
    connect("coo", ["cto", "cmo", "cro"], DEPT_COLORS.coo.accentHex);
    // CTO → team leads
    connect("cto", ["forge", "pixel", "sentinel"], DEPT_COLORS.cto.accentHex);
    // CMO → team leads
    connect("cmo", ["scriptbot", "echo"], DEPT_COLORS.cmo.accentHex);
    // CRO → team leads
    connect("cro", ["builder", "scout", "pit"], DEPT_COLORS.cro.accentHex);

    setLines(newLines);
  }, []);

  useEffect(() => {
    // Initial compute after render + a small delay for layout
    const timer = setTimeout(computeLines, 100);
    // Recompute on resize
    window.addEventListener("resize", computeLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", computeLines);
    };
  }, [computeLines]);

  const coo = orgTree.children![0];
  const cto = coo.children![0];
  const cmo = coo.children![1];
  const cro = coo.children![2];

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <ConnectorOverlay lines={lines} />

      {/* TIER 1: CEO */}
      <div className="flex justify-center mb-16 relative z-10">
        <div className="w-full max-w-md" data-node="ceo">
          <ExecutiveCard agent={orgTree} />
        </div>
      </div>

      {/* TIER 2: COO */}
      <div className="flex justify-center mb-16 relative z-10">
        <div className="w-full max-w-md" data-node="coo">
          <ExecutiveCard agent={coo} />
        </div>
      </div>

      {/* TIER 3: CTO / CMO / CRO */}
      <div className="grid grid-cols-3 gap-6 mb-16 relative z-10">
        <div data-node="cto">
          <ExecutiveCard agent={cto} />
        </div>
        <div data-node="cmo">
          <ExecutiveCard agent={cmo} />
        </div>
        <div data-node="cro">
          <ExecutiveCard agent={cro} />
        </div>
      </div>

      {/* TIER 4: Team Leads */}
      <div className="grid grid-cols-3 gap-6 relative z-10">
        {/* CTO leads */}
        <div className="space-y-3">
          {cto.children!.map((agent) => (
            <div key={agent.id} data-node={agent.id}>
              <TeamLeadCard agent={agent} />
            </div>
          ))}
        </div>
        {/* CMO leads */}
        <div className="space-y-3">
          {cmo.children!.map((agent) => (
            <div key={agent.id} data-node={agent.id}>
              <TeamLeadCard agent={agent} />
            </div>
          ))}
        </div>
        {/* CRO leads */}
        <div className="space-y-3">
          {cro.children!.map((agent) => (
            <div key={agent.id} data-node={agent.id}>
              <TeamLeadCard agent={agent} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Mobile Layout — stacked cards with department grouping
   ═══════════════════════════════════════════════════════════════ */

function MobileTree() {
  const coo = orgTree.children![0];
  const cto = coo.children![0];
  const cmo = coo.children![1];
  const cro = coo.children![2];

  const DeptSection = ({
    head,
    leads,
    dept,
  }: {
    head: Agent;
    leads: Agent[];
    dept: Department;
  }) => {
    const colors = DEPT_COLORS[dept];
    return (
      <div className="space-y-3">
        <ExecutiveCard agent={head} />
        <div className={`ml-4 pl-4 border-l-2 ${colors.border} space-y-3`}>
          {leads.map((l) => (
            <TeamLeadCard key={l.id} agent={l} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="lg:hidden space-y-6">
      {/* CEO */}
      <ExecutiveCard agent={orgTree} />

      {/* COO */}
      <div className="ml-3 pl-4 border-l-2 border-violet-500/30 space-y-6">
        <ExecutiveCard agent={coo} />

        {/* Department Sections */}
        <DeptSection head={cto} leads={cto.children!} dept="cto" />
        <DeptSection head={cmo} leads={cmo.children!} dept="cmo" />
        <DeptSection head={cro} leads={cro.children!} dept="cro" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Status Legend
   ═══════════════════════════════════════════════════════════════ */

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-6 px-5 py-3 bg-slate-950/60 rounded-xl border border-slate-800/60 backdrop-blur-sm">
      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest">
        Status
      </span>
      {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG.active][]).map(
        ([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <StatusDot status={key} />
            <span className="text-xs text-slate-400 font-medium">{cfg.label}</span>
          </div>
        )
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Stats Bar
   ═══════════════════════════════════════════════════════════════ */

function StatsBar() {
  const allAgents = flattenAgents(orgTree);
  const activeCount = allAgents.filter((a) => a.status === "active").length;
  const idleCount = allAgents.filter((a) => a.status === "idle").length;
  const standbyCount = allAgents.filter((a) => a.status === "standby").length;

  const stats = [
    { label: "Total Agents", value: allAgents.length, color: "text-slate-100" },
    { label: "Active", value: activeCount, color: "text-emerald-400" },
    { label: "Idle", value: idleCount, color: "text-amber-400" },
    { label: "Standby", value: standbyCount, color: "text-slate-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-slate-950/60 rounded-xl border border-slate-800/60 px-4 py-3 text-center"
        >
          <div className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.value}</div>
          <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function flattenAgents(node: Agent): Agent[] {
  const result: Agent[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenAgents(child));
    }
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════ */

export default function OrgChartPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-primary-600/20 rounded-xl flex items-center justify-center border border-primary-500/10">
          <Network className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Org Chart
          </h1>
          <p className="text-sm text-slate-500">
            Agent hierarchy &amp; model assignments
          </p>
        </div>
      </div>

      {/* Legend + Stats */}
      <div className="space-y-4">
        <StatusLegend />
        <StatsBar />
      </div>

      {/* Tree Visualization */}
      <DesktopTree />
      <MobileTree />

      {/* ═══════════════════════════════════════════════════════════════
         Playbook: How Work Gets Done
         ═══════════════════════════════════════════════════════════════ */}
      <PlaybookSection />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Playbook: Collapsible Section Wrapper
   ═══════════════════════════════════════════════════════════════ */

function CollapsibleSection({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/30 transition-colors text-left"
      >
        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-800/40">
          {children}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Execution Tiers
   ═══════════════════════════════════════════════════════════════ */

const TIERS = [
  {
    tier: 1,
    label: "Direct",
    time: "< 5 min",
    desc: "Theo handles directly. Questions, lookups, quick edits.",
    cost: "~$0.01–0.05",
    gradient: "from-violet-900/30 via-violet-950/20 to-slate-900/40",
    accent: "text-violet-400",
    border: "border-violet-500/20",
  },
  {
    tier: 2,
    label: "Single Agent",
    time: "5–30 min",
    desc: "One sub-agent, one job. Feature work, content, analysis.",
    cost: "~$0.05–0.50",
    gradient: "from-cyan-900/30 via-cyan-950/20 to-slate-900/40",
    accent: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  {
    tier: 3,
    label: "The Forge",
    time: "30 min – 2 hrs",
    desc: "Parallel agents, coordinated sprint. Multi-file features.",
    cost: "~$0.50–5.00",
    gradient: "from-amber-900/30 via-amber-950/20 to-slate-900/40",
    accent: "text-amber-400",
    border: "border-amber-500/20",
  },
  {
    tier: 4,
    label: "Overnight Sprint",
    time: "2+ hrs",
    desc: "Full Forge protocol. Major builds.",
    cost: "~$5–20",
    gradient: "from-rose-900/30 via-rose-950/20 to-slate-900/40",
    accent: "text-rose-400",
    border: "border-rose-500/20",
  },
];

function ExecutionTiers() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
      {TIERS.map((t) => (
        <div
          key={t.tier}
          className={`rounded-xl border ${t.border} bg-gradient-to-br ${t.gradient} p-4 transition-all hover:scale-[1.01]`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold ${t.accent} bg-slate-950/50 px-2 py-0.5 rounded-md`}>
              Tier {t.tier}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">{t.time}</span>
          </div>
          <h4 className="text-sm font-semibold text-slate-200 mb-1">{t.label}</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">{t.desc}</p>
          <div className="text-[11px] text-slate-500 font-mono">
            Cost: <span className={t.accent}>{t.cost}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Auto-Router
   ═══════════════════════════════════════════════════════════════ */

const ROUTES = [
  { task: "Build / Fix code", agents: ["Atlas", "CTO"], color: "text-cyan-400" },
  { task: "Write content", agents: ["Muse", "ScriptBot"], color: "text-rose-400" },
  { task: "Post social", agents: ["Muse", "Echo"], color: "text-rose-400" },
  { task: "Trading / optimize", agents: ["Venture", "The Pit"], color: "text-emerald-400" },
  { task: "Test / audit", agents: ["Atlas", "Sentinel"], color: "text-cyan-400" },
  { task: "Design / UI", agents: ["Atlas", "Pixel"], color: "text-cyan-400" },
  { task: "Research / question", agents: ["Theo (direct)"], color: "text-violet-400" },
];

function AutoRouter() {
  return (
    <div className="mt-3 overflow-x-auto">
      <div className="min-w-[400px] space-y-1.5">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
          <span>Task Pattern</span>
          <span />
          <span>Routed To</span>
        </div>
        {ROUTES.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-3 py-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 hover:bg-slate-900/60 transition-colors"
          >
            <span className="text-sm text-slate-300 font-medium">{r.task}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <span className={`text-sm font-semibold ${r.color}`}>
              {r.agents.join(" → ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Model Strategy
   ═══════════════════════════════════════════════════════════════ */

const MODELS = [
  {
    icon: "🧠",
    name: "Opus",
    pricing: "$15 / $75 per 1M",
    role: "Reasoning (Theo only)",
    gradient: "from-violet-900/30 to-slate-900/40",
    border: "border-violet-500/20",
    accent: "text-violet-400",
    bar: "bg-violet-500",
    barWidth: "100%",
  },
  {
    icon: "⚡",
    name: "Sonnet",
    pricing: "$3 / $15 per 1M",
    role: "Workhorse (most agents)",
    gradient: "from-blue-900/30 to-slate-900/40",
    border: "border-blue-500/20",
    accent: "text-blue-400",
    bar: "bg-blue-500",
    barWidth: "60%",
  },
  {
    icon: "💨",
    name: "Haiku",
    pricing: "$0.25 / $1.25 per 1M",
    role: "Lightweight (monitoring, social, QA)",
    gradient: "from-teal-900/30 to-slate-900/40",
    border: "border-teal-500/20",
    accent: "text-teal-400",
    bar: "bg-teal-500",
    barWidth: "20%",
  },
  {
    icon: "🔥",
    name: "Flash",
    pricing: "$0.075 / $0.30 per 1M",
    role: "Bulk processing",
    gradient: "from-orange-900/30 to-slate-900/40",
    border: "border-orange-500/20",
    accent: "text-orange-400",
    bar: "bg-orange-500",
    barWidth: "8%",
  },
];

function ModelStrategy() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {MODELS.map((m) => (
        <div
          key={m.name}
          className={`rounded-xl border ${m.border} bg-gradient-to-r ${m.gradient} p-4`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{m.icon}</span>
            <h4 className={`text-sm font-bold ${m.accent}`}>{m.name}</h4>
          </div>
          <p className="text-xs text-slate-400 mb-1">{m.role}</p>
          <p className="text-[11px] text-slate-500 font-mono mb-3">{m.pricing}</p>
          {/* Cost bar */}
          <div className="h-1.5 rounded-full bg-slate-800/60 overflow-hidden">
            <div
              className={`h-full rounded-full ${m.bar} opacity-60`}
              style={{ width: m.barWidth }}
            />
          </div>
          <p className="text-[10px] text-slate-600 mt-1 text-right">Relative cost</p>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Playbook Section (Composed)
   ═══════════════════════════════════════════════════════════════ */

function PlaybookSection() {
  return (
    <div className="space-y-4 mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <h2 className="text-lg font-bold text-slate-300 tracking-tight whitespace-nowrap">
          How Work Gets Done
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>

      <CollapsibleSection
        title="Execution Tiers"
        subtitle="How tasks are sized and routed by complexity"
        icon={<Timer className="w-4 h-4 text-violet-400" />}
        defaultOpen
      >
        <ExecutionTiers />
      </CollapsibleSection>

      <CollapsibleSection
        title="Auto-Router"
        subtitle="Task pattern → agent mapping"
        icon={<ArrowRight className="w-4 h-4 text-violet-400" />}
      >
        <AutoRouter />
      </CollapsibleSection>

      <CollapsibleSection
        title="Model Strategy"
        subtitle="Cost tiers and model assignments"
        icon={<Cpu className="w-4 h-4 text-violet-400" />}
      >
        <ModelStrategy />
      </CollapsibleSection>
    </div>
  );
}
