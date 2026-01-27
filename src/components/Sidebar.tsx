"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Plug,
  Sparkles,
  Settings,
  BarChart3,
  Bot,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/connections", icon: Plug, label: "Connections" },
  { href: "/skills", icon: Sparkles, label: "Skills" },
  { href: "/usage", icon: BarChart3, label: "Usage" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-blue rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Clawdbot</h1>
            <p className="text-xs text-gray-500">Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-accent-purple/20 text-accent-purple"
                  : "text-gray-400 hover:bg-dark-700 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-dark-600">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          <span className="text-gray-400">Gateway Online</span>
        </div>
      </div>
    </aside>
  );
}
