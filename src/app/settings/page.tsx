"use client";

import { useState } from "react";
import { useHubStore } from "@/lib/store";
import { Settings as SettingsIcon, Shield, Database, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const { tasks, skills, connections, usage, initialize } = useHubStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1 text-sm lg:text-base">Configuration and data management</p>
      </div>

      {/* Database Stats */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-purple/20 rounded-lg">
            <Database className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Database</h2>
            <p className="text-sm text-gray-400">Supabase connection status</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-accent-purple">{tasks.length}</p>
            <p className="text-sm text-gray-400">Tasks</p>
          </div>
          <div className="bg-dark-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-accent-blue">{skills.length}</p>
            <p className="text-sm text-gray-400">Skills</p>
          </div>
          <div className="bg-dark-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-accent-green">{connections.length}</p>
            <p className="text-sm text-gray-400">Connections</p>
          </div>
          <div className="bg-dark-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-accent-yellow">{usage.length}</p>
            <p className="text-sm text-gray-400">Usage Records</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full py-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* Configuration */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-blue/20 rounded-lg">
            <SettingsIcon className="w-5 h-5 text-accent-blue" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Configuration</h2>
            <p className="text-sm text-gray-400">Environment settings</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
            <span className="text-gray-400">Supabase</span>
            <span className="px-2 py-1 bg-accent-green/20 text-accent-green rounded text-sm">
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
            <span className="text-gray-400">Authentication</span>
            <span className="px-2 py-1 bg-accent-green/20 text-accent-green rounded text-sm">
              Enabled
            </span>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-red/20 rounded-lg">
            <Shield className="w-5 h-5 text-accent-red" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Security</h2>
            <p className="text-sm text-gray-400">Session management</p>
          </div>
        </div>

        <button
          onClick={async () => {
            if (confirm("Sign out of Clawdbot Hub?")) {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }
          }}
          className="w-full py-3 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
