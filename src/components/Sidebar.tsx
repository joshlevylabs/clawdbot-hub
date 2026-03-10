"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  Menu,
  X,
  LogOut,
  Clock,
  Sunrise,
  Mic,
  Mail,
  MessageSquare,
  TrendingUp,
  Lock,
  Network,
  ClipboardList,
  Activity,
  Palette,
  Package,
  BookOpen,
  Receipt,
  Brain,
} from "lucide-react";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: Sunrise, label: "Dashboard" },
  { href: "/bulletin", icon: ClipboardList, label: "Bulletin" },
  { href: "/org-chart", icon: Network, label: "Command Center" },
  { href: "/standups", icon: MessageSquare, label: "Standups" },
  { href: "/trading", icon: TrendingUp, label: "Finance" },
  { href: "/morning-brief", icon: Clock, label: "Morning Brief" },
  { href: "/marketing", icon: Mic, label: "Marketing" },
  { href: "/faith-journey", icon: BookOpen, label: "Faith Journey" },
  { href: "/memories", icon: Brain, label: "Agent Memory" },
  { href: "/registry", icon: Package, label: "Registry" },
  { href: "/brand", icon: Palette, label: "Brand" },
  { href: "/vault", icon: Lock, label: "Secure Vault" },
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

  // Hide sidebar on chart export pages (used for newsletter screenshots)
  if (pathname?.startsWith("/charts/export")) {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0B0B11", borderColor: "#2A2A38" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #D4A020 0%, #B8860B 100%)" }}
          >
            <span className="font-bold text-sm" style={{ color: "#0B0B11" }}>J</span>
          </div>
          <span className="font-semibold" style={{ color: "#F5F5F0", fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}>JoshOS Hub</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "#8B8B80" }}
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
          w-64 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          lg:transform-none
        `}
        style={{ backgroundColor: "#0B0B11", borderRight: "1px solid #2A2A38" }}
      >
        {/* Logo */}
        <div className="hidden lg:block p-6" style={{ borderBottom: "1px solid #2A2A38" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #D4A020 0%, #B8860B 100%)",
                boxShadow: "0 0 16px rgba(212, 160, 32, 0.25)",
              }}
            >
              <span className="font-bold text-lg" style={{ color: "#0B0B11" }}>J</span>
            </div>
            <div>
              <h1 className="font-semibold" style={{ color: "#F5F5F0", fontFamily: "var(--font-space-grotesk), system-ui, sans-serif", letterSpacing: "-0.02em" }}>JoshOS</h1>
              <p className="text-xs font-medium" style={{ color: "#D4A020" }}>Hub</p>
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150"
                style={{
                  backgroundColor: isActive ? "rgba(212, 160, 32, 0.12)" : "transparent",
                  color: isActive ? "#D4A020" : "#8B8B80",
                  borderLeft: isActive ? "2px solid #D4A020" : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(26, 26, 36, 0.5)";
                    e.currentTarget.style.color = "#F5F5F0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#8B8B80";
                  }
                }}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="font-medium text-sm" style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status & Logout */}
        <div className="p-4 space-y-4" style={{ borderTop: "1px solid #2A2A38" }}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#10B981" }} />
            <span className="text-sm" style={{ color: "#626259" }}>Gateway Online</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm transition-colors w-full px-4 py-2 rounded-lg"
            style={{ color: "#626259" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#F5F5F0";
              e.currentTarget.style.backgroundColor = "rgba(26, 26, 36, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#626259";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
