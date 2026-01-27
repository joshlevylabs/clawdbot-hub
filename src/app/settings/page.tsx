"use client";

import { useState } from "react";
import { useHubStore } from "@/lib/store";
import { Key, Eye, EyeOff, Save, Trash2, Shield, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { connections, updateConnection, deleteConnection } = useHubStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const apiConnections = connections.filter((c) =>
    ["anthropic", "openai", "github", "google"].includes(c.type)
  );

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleKeyChange = (id: string, value: string) => {
    setEditingKey((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = (id: string) => {
    const newKey = editingKey[id];
    if (newKey !== undefined) {
      updateConnection(id, {
        apiKey: newKey,
        status: newKey ? "connected" : "disconnected",
        lastSync: new Date().toISOString(),
      });
      setSaved(id);
      setTimeout(() => setSaved(null), 2000);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this API key?")) {
      updateConnection(id, { apiKey: undefined, status: "disconnected" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Manage API keys and configuration</p>
      </div>

      {/* Security Notice */}
      <div className="bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-accent-yellow">Security Notice</p>
          <p className="text-sm text-gray-400 mt-1">
            API keys are stored locally in your browser. Never share your keys with anyone.
            Consider using environment variables for production deployments.
          </p>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-purple/20 rounded-lg">
            <Key className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">API Keys</h2>
            <p className="text-sm text-gray-400">Configure your service credentials</p>
          </div>
        </div>

        <div className="space-y-4">
          {apiConnections.map((conn) => {
            const currentKey = editingKey[conn.id] ?? conn.apiKey ?? "";
            const isShowing = showKeys[conn.id];

            return (
              <div key={conn.id} className="p-4 bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{conn.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        conn.status === "connected"
                          ? "bg-accent-green/20 text-accent-green"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {conn.status}
                    </span>
                    {saved === conn.id && (
                      <span className="text-xs text-accent-green">Saved!</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleShowKey(conn.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded transition-colors"
                    >
                      {isShowing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {conn.apiKey && (
                      <button
                        onClick={() => handleDelete(conn.id)}
                        className="p-2 text-gray-400 hover:text-accent-red hover:bg-dark-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type={isShowing ? "text" : "password"}
                    value={currentKey}
                    onChange={(e) => handleKeyChange(conn.id, e.target.value)}
                    className="flex-1 px-3 py-2 bg-dark-800 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none font-mono text-sm"
                    placeholder={`Enter ${conn.name} API key...`}
                  />
                  <button
                    onClick={() => handleSave(conn.id)}
                    className="px-4 py-2 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            );
          })}

          {apiConnections.length === 0 && (
            <p className="text-gray-400 text-center py-4">
              No API connections configured. Add connections from the Connections page.
            </p>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-red/20 rounded-lg">
            <Shield className="w-5 h-5 text-accent-red" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Data Management</h2>
            <p className="text-sm text-gray-400">Manage your local data</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              if (confirm("Export all data as JSON?")) {
                const data = localStorage.getItem("clawdbot-hub-storage");
                const blob = new Blob([data || "{}"], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "clawdbot-hub-export.json";
                a.click();
              }
            }}
            className="w-full py-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors text-left px-4"
          >
            Export Data
          </button>
          <button
            onClick={() => {
              if (confirm("This will clear all local data. Are you sure?")) {
                localStorage.removeItem("clawdbot-hub-storage");
                window.location.reload();
              }
            }}
            className="w-full py-3 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30 transition-colors text-left px-4"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
