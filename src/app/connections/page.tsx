"use client";

import { useState } from "react";
import { useHubStore, Connection } from "@/lib/store";
import { Plus, Trash2, RefreshCw, ExternalLink, X, Check, AlertCircle } from "lucide-react";

const connectionTypes: { type: Connection["type"]; name: string; icon: string }[] = [
  { type: "github", name: "GitHub", icon: "🐙" },
  { type: "google", name: "Google", icon: "🔵" },
  { type: "anthropic", name: "Anthropic", icon: "🤖" },
  { type: "openai", name: "OpenAI", icon: "🧠" },
  { type: "slack", name: "Slack", icon: "💬" },
  { type: "telegram", name: "Telegram", icon: "✈️" },
  { type: "custom", name: "Custom", icon: "🔧" },
];

export default function ConnectionsPage() {
  const { connections, addConnection, updateConnection, deleteConnection } = useHubStore();
  const [showModal, setShowModal] = useState(false);
  const [newConn, setNewConn] = useState<Partial<Connection>>({
    name: "",
    type: "custom",
    status: "disconnected",
  });

  const handleAdd = () => {
    if (newConn.name && newConn.type) {
      addConnection({
        name: newConn.name,
        type: newConn.type,
        status: newConn.apiKey ? "connected" : "disconnected",
        apiKey: newConn.apiKey,
        lastSync: new Date().toISOString(),
      });
      setNewConn({ name: "", type: "custom", status: "disconnected" });
      setShowModal(false);
    }
  };

  const handleRefresh = (id: string) => {
    updateConnection(id, { lastSync: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connections</h1>
          <p className="text-gray-400 mt-1">Manage your service integrations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Connection
        </button>
      </div>

      {/* Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.map((conn) => {
          const typeInfo = connectionTypes.find((t) => t.type === conn.type);
          return (
            <div
              key={conn.id}
              className="bg-dark-800 rounded-xl border border-dark-600 p-6 hover:border-dark-500 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{typeInfo?.icon || "🔧"}</span>
                  <div>
                    <h3 className="font-semibold">{conn.name}</h3>
                    <p className="text-sm text-gray-400">{typeInfo?.name || conn.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn.status === "connected" ? (
                    <Check className="w-5 h-5 text-accent-green" />
                  ) : conn.status === "error" ? (
                    <AlertCircle className="w-5 h-5 text-accent-red" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {conn.lastSync
                    ? `Last sync: ${new Date(conn.lastSync).toLocaleDateString()}`
                    : "Never synced"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRefresh(conn.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteConnection(conn.id)}
                    className="p-2 text-gray-400 hover:text-accent-red hover:bg-dark-700 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {conn.apiKey && (
                <div className="mt-3 p-2 bg-dark-700 rounded text-xs font-mono text-gray-400">
                  {conn.apiKey.slice(0, 10)}...{conn.apiKey.slice(-4)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Connection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add Connection</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Service Type</label>
                <select
                  value={newConn.type}
                  onChange={(e) => setNewConn({ ...newConn, type: e.target.value as Connection["type"] })}
                  className="w-full px-3 py-2 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none"
                >
                  {connectionTypes.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newConn.name}
                  onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none"
                  placeholder="Connection name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">API Key (optional)</label>
                <input
                  type="password"
                  value={newConn.apiKey || ""}
                  onChange={(e) => setNewConn({ ...newConn, apiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none font-mono"
                  placeholder="sk-..."
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors font-medium"
              >
                Add Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
