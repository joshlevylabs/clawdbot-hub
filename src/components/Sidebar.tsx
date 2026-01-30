"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Link2,
  Zap,
  Settings,
  BarChart2,
  Menu,
  X,
  LogOut,
  Clock,
  Sunrise,
  Heart,
  Mic,
} from "lucide-react";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: Sunrise, label: "Dashboard" },
  { href: "/morning-brief", icon: Clock, label: "Morning Brief" },
  { href: "/markets", icon: BarChart2, label: "Markets" },
  { href: "/podcast", icon: Mic, label: "Podcast" },
  { href: "/marriage", icon: Heart, label: "Marriage" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/skills", icon: Zap, label: "Skills" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-slate-100">Clawdbot Hub</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-slate-950 border-r border-slate-800 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          lg:transform-none
        `}
      >
        {/* Logo */}
        <div className="hidden lg:block p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="font-semibold text-slate-100">Clawdbot</h1>
              <p className="text-xs text-slate-500 font-medium">Hub</p>
            </div>
          </div>
        </div>

        {/* Mobile spacer */}
        <div className="lg:hidden h-16" />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-primary-600/15 text-primary-400 border-l-2 border-primary-500"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-l-2 border-transparent"
                }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 bg-accent-500 rounded-full" />
            <span className="text-sm text-slate-500">Gateway Online</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm text-slate-500 hover:text-slate-300 transition-colors w-full px-4 py-2 rounded-lg hover:bg-slate-800/50"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
