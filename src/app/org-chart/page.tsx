"use client";

import { useState } from "react";
import { Network, ChevronDown, ChevronRight, Zap, Shield, Palette, DollarSign, Bot } from "lucide-react";

interface OrgNode {
  id: string;
  name: string;
  title: string;
  role: string;
  models: string[];
  status: "active" | "idle" | "standby";
  description: string;
  children?: OrgNode[];
}

const orgData: OrgNode = {
  id: "ceo",
  name: "Joshua",
  title: "CEO",
  role: "Vision, strategy, final decisions",
  models: ["Human"],
  status: "active",
  description: "Sets the vision and makes all final calls. The builder.",
  children: [
    {
      id: "coo",
      name: "Theo",
      title: "COO",
      role: "Research, delegation, orchestration",
      models: ["Claude Opus 4.6"],
      status: "active",
      description: "Always available. Manages all agent operations, delegates tasks, runs research. The right hand.",
      children: [
        {
          id: "cto",
          name: "Atlas",
          title: "CTO",
          role: "Engineering",
          models: ["Claude Sonnet 4", "Codex 5.3"],
          status: "active",
          description: "Backend, security, frontend, DevOps, QA. Owns all code and infrastructure.",
          children: [
            {
              id: "backend",
              name: "Forge",
              title: "Backend Lead",
              role: "APIs, databases, security",
              models: ["Claude Sonnet 4"],
              status: "active",
              description: "Backend services, database design, API architecture, security hardening.",
            },
            {
              id: "frontend",
              name: "Pixel",
              title: "Frontend Lead",
              role: "UI/UX, DevOps",
              models: ["Codex 5.3"],
              status: "idle",
              description: "Frontend development, CI/CD pipelines, deployment automation.",
            },
            {
              id: "qa",
              name: "Sentinel",
              title: "QA Lead",
              role: "Testing, reliability",
              models: ["Gemini 3 Flash"],
              status: "standby",
              description: "Automated testing, code review, quality gates.",
            },
          ],
        },
        {
          id: "cmo",
          name: "Muse",
          title: "CMO",
          role: "Marketing & Content",
          models: ["Claude Opus 4.6", "Gemini 3 Flash"],
          status: "active",
          description: "Content creation, podcast scripts, newsletter, social automation, creative direction.",
          children: [
            {
              id: "content",
              name: "ScriptBot",
              title: "Content Lead",
              role: "Podcast & newsletter",
              models: ["Claude Opus 4.6"],
              status: "active",
              description: "Writes podcast scripts, newsletter editions, blog posts.",
            },
            {
              id: "social",
              name: "Echo",
              title: "Social Lead",
              role: "Social automation",
              models: ["Gemini 3 Flash"],
              status: "idle",
              description: "Social media scheduling, engagement, community posts.",
            },
          ],
        },
        {
          id: "cro",
          name: "Venture",
          title: "CRO",
          role: "Revenue & Growth",
          models: ["Claude Sonnet 4"],
          status: "standby",
          description: "Products, growth strategy, community building, monetization.",
          children: [
            {
              id: "products",
              name: "Builder",
              title: "Products Lead",
              role: "Product development",
              models: ["Claude Sonnet 4"],
              status: "standby",
              description: "New product ideation, feature development, market fit.",
            },
            {
              id: "growth",
              name: "Scout",
              title: "Growth Lead",
              role: "Community & growth",
              models: ["Gemini 3 Flash"],
              status: "idle",
              description: "User acquisition, community management, analytics.",
            },
          ],
        },
      ],
    },
  ],
};

const statusConfig = {
  active: { color: "bg-emerald-500", pulse: true, label: "Active" },
  idle: { color: "bg-amber-500", pulse: false, label: "Idle" },
  standby: { color: "bg-slate-500", pulse: false, label: "Standby" },
};

function OrgCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const status = statusConfig[node.status];
  const hasChildren = node.children && node.children.length > 0;

  const gradientMap: Record<string, string> = {
    ceo: "from-amber-600/20 to-orange-600/10",
    coo: "from-primary-600/20 to-violet-600/10",
    cto: "from-cyan-600/20 to-blue-600/10",
    cmo: "from-pink-600/20 to-rose-600/10",
    cro: "from-emerald-600/20 to-teal-600/10",
  };

  const borderMap: Record<string, string> = {
    ceo: "border-amber-600/30",
    coo: "border-primary-600/30",
    cto: "border-cyan-600/30",
    cmo: "border-pink-600/30",
    cro: "border-emerald-600/30",
  };

  const gradient = gradientMap[node.id] || "from-slate-800/50 to-slate-900/50";
  const border = borderMap[node.id] || "border-slate-700/50";

  const iconMap: Record<string, React.ReactNode> = {
    ceo: <Zap className="w-4 h-4 text-amber-400" />,
    coo: <Bot className="w-4 h-4 text-primary-400" />,
    cto: <Shield className="w-4 h-4 text-cyan-400" />,
    cmo: <Palette className="w-4 h-4 text-pink-400" />,
    cro: <DollarSign className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`bg-gradient-to-br ${gradient} rounded-xl border ${border} p-4 w-full max-w-xs cursor-pointer hover:scale-[1.02] transition-transform duration-150`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {iconMap[node.id] || <Bot className="w-4 h-4 text-slate-400" />}
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">{node.name}</h3>
              <p className="text-xs text-slate-400">{node.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status.color} ${status.pulse ? "animate-pulse" : ""}`} />
              <span className="text-xs text-slate-500">{status.label}</span>
            </div>
            {hasChildren && (
              <span className="text-slate-500">
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-3 leading-relaxed">{node.description}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {node.models.map((model) => (
            <span
              key={model}
              className="px-2 py-0.5 bg-slate-800/60 rounded text-xs text-slate-300 border border-slate-700/50"
            >
              {model}
            </span>
          ))}
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="relative mt-4 w-full">
          {/* Vertical connector from parent */}
          <div className="absolute left-1/2 -top-4 w-px h-4 bg-slate-700" />

          {/* Horizontal connector bar */}
          {node.children!.length > 1 && (
            <div className="absolute top-0 left-0 right-0 flex justify-center">
              <div
                className="h-px bg-slate-700"
                style={{
                  width: `${Math.min(90, node.children!.length * 30)}%`,
                }}
              />
            </div>
          )}

          <div className={`grid gap-4 ${
            node.children!.length === 1 ? "grid-cols-1 max-w-xs mx-auto" :
            node.children!.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto" :
            "grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto"
          }`}>
            {node.children!.map((child) => (
              <div key={child.id} className="relative">
                {/* Vertical connector to child */}
                <div className="hidden md:block absolute left-1/2 -top-4 w-px h-4 bg-slate-700" />
                <OrgCard node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <Network className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Org Chart</h1>
            <p className="text-slate-500 text-sm">Clawdbot agent hierarchy & assignments</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-3 bg-slate-900/50 rounded-lg border border-slate-800">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Status</span>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`} />
            <span className="text-xs text-slate-400">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Org Tree */}
      <div className="py-4">
        <OrgCard node={orgData} />
      </div>
    </div>
  );
}
