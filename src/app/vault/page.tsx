"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Lock,
  Unlock,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  X,
  Search,
  Shield,
  Key,
  KeyRound,
  FileKey,
  Award,
  Hash,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { encrypt, decrypt } from "@/lib/vault-crypto";

/* ─── Types ─── */
interface Secret {
  id: string;
  name: string;
  category: string;
  encrypted_value: string;
  iv: string;
  salt: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type Category = "api_key" | "token" | "password" | "ssh_key" | "certificate" | "other";

const CATEGORIES: { value: Category; label: string; color: string; icon: typeof Key }[] = [
  { value: "api_key", label: "API Key", color: "bg-blue-500/20 text-blue-400", icon: Key },
  { value: "token", label: "Token", color: "bg-purple-500/20 text-purple-400", icon: Hash },
  { value: "password", label: "Password", color: "bg-amber-500/20 text-amber-400", icon: Lock },
  { value: "ssh_key", label: "SSH Key", color: "bg-emerald-500/20 text-emerald-400", icon: FileKey },
  { value: "certificate", label: "Certificate", color: "bg-rose-500/20 text-rose-400", icon: Award },
  { value: "other", label: "Other", color: "bg-slate-500/20 text-slate-400", icon: KeyRound },
];

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function getCategoryInfo(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[5];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ─── Toast ─── */
interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm animate-slide-up cursor-pointer ${
            t.type === "success"
              ? "bg-emerald-950/90 border-emerald-800 text-emerald-300"
              : t.type === "error"
              ? "bg-red-950/90 border-red-800 text-red-300"
              : "bg-slate-900/90 border-slate-700 text-slate-300"
          }`}
          onClick={() => dismiss(t.id)}
        >
          {t.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : t.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Shield className="w-4 h-4 shrink-0" />
          )}
          <span className="text-sm font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export default function VaultPage() {
  // Auth & state
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [viewingSecret, setViewingSecret] = useState<{ name: string; value: string } | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<Secret | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<Category>("api_key");
  const [formValue, setFormValue] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Auto-lock timer
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Reset idle timer on interaction
  const resetIdleTimer = useCallback(() => {
    if (!masterPassword) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setMasterPassword(null);
      setSecrets([]);
      toast("Vault auto-locked after 5 min idle", "info");
    }, IDLE_TIMEOUT_MS);
  }, [masterPassword, toast]);

  useEffect(() => {
    if (!masterPassword) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [masterPassword, resetIdleTimer]);

  // Fetch secrets
  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vault");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSecrets(data.secrets || []);
    } catch {
      toast("Failed to load secrets", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // On unlock
  const handleUnlock = async () => {
    if (!passwordInput.trim()) return;
    setUnlocking(true);

    try {
      // Verify the password works by doing a test encrypt/decrypt cycle
      const testData = await encrypt("vault-test", passwordInput);
      const result = await decrypt(testData.encrypted, testData.iv, testData.salt, passwordInput);
      if (result !== "vault-test") throw new Error("Crypto verification failed");

      setMasterPassword(passwordInput);
      setPasswordInput("");
      await fetchSecrets();
      toast("Vault unlocked", "success");
    } catch {
      toast("Failed to verify password", "error");
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    setMasterPassword(null);
    setSecrets([]);
    setSearch("");
    setFilterCategory("all");
    if (idleTimer.current) clearTimeout(idleTimer.current);
    toast("Vault locked", "info");
  };

  // Add / Edit secret
  const resetForm = () => {
    setFormName("");
    setFormCategory("api_key");
    setFormValue("");
    setFormNotes("");
  };

  const openAddModal = () => {
    resetForm();
    setEditingSecret(null);
    setShowAddModal(true);
  };

  const openEditModal = async (secret: Secret) => {
    if (!masterPassword) return;
    setFormName(secret.name);
    setFormCategory(secret.category as Category);
    setFormNotes(secret.notes || "");
    // Decrypt value for editing
    try {
      const plaintext = await decrypt(
        secret.encrypted_value,
        secret.iv,
        secret.salt,
        masterPassword
      );
      setFormValue(plaintext);
    } catch {
      toast("Failed to decrypt — wrong master password?", "error");
      return;
    }
    setEditingSecret(secret);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!masterPassword || !formName.trim() || !formValue.trim()) return;
    setSaving(true);

    try {
      const { encrypted, iv, salt } = await encrypt(formValue, masterPassword);
      const payload: Record<string, unknown> = {
        name: formName.trim(),
        category: formCategory,
        encrypted_value: encrypted,
        iv,
        salt,
        notes: formNotes.trim() || null,
      };

      if (editingSecret) {
        payload.id = editingSecret.id;
        const res = await fetch("/api/vault", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast("Secret updated", "success");
      } else {
        const res = await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast("Secret saved", "success");
      }

      setShowAddModal(false);
      resetForm();
      setEditingSecret(null);
      await fetchSecrets();
    } catch {
      toast("Failed to save secret", "error");
    } finally {
      setSaving(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async (secret: Secret) => {
    if (!masterPassword) return;
    try {
      const plaintext = await decrypt(
        secret.encrypted_value,
        secret.iv,
        secret.salt,
        masterPassword
      );
      await navigator.clipboard.writeText(plaintext);
      toast("Copied! Clipboard clears in 30s", "success");

      // Auto-clear clipboard after 30s
      setTimeout(async () => {
        try {
          await navigator.clipboard.writeText("");
        } catch {
          // Clipboard API may fail if page not focused
        }
      }, 30_000);
    } catch {
      toast("Failed to decrypt — wrong master password?", "error");
    }
  };

  // View secret
  const handleView = async (secret: Secret) => {
    if (!masterPassword) return;
    try {
      const plaintext = await decrypt(
        secret.encrypted_value,
        secret.iv,
        secret.salt,
        masterPassword
      );
      setViewingSecret({ name: secret.name, value: plaintext });
      // Auto-hide after 30s
      setTimeout(() => setViewingSecret(null), 30_000);
    } catch {
      toast("Failed to decrypt — wrong master password?", "error");
    }
  };

  // Delete secret
  const handleDelete = async () => {
    if (!deletingSecret) return;
    try {
      const res = await fetch(`/api/vault?id=${deletingSecret.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Secret deleted", "success");
      setDeletingSecret(null);
      await fetchSecrets();
    } catch {
      toast("Failed to delete secret", "error");
    }
  };

  // Filter secrets
  const filtered = secrets.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filterCategory === "all" || s.category === filterCategory;
    return matchSearch && matchCategory;
  });

  /* ─── LOCKED STATE ─── */
  if (!masterPassword) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6 border border-slate-700/50">
              <Lock className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-semibold text-slate-100">Secret Vault</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Enter your master password to unlock
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Master Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  className="w-full px-4 py-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-200 placeholder:text-slate-600 font-mono"
                  placeholder="••••••••••••"
                  autoFocus
                />
              </div>
              <button
                onClick={handleUnlock}
                disabled={unlocking || !passwordInput.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors font-medium text-white flex items-center justify-center gap-2"
              >
                {unlocking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Unlock Vault
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  All encryption runs in your browser. Your master password is never stored or sent to the server.
                </span>
              </div>
            </div>
          </div>
        </div>

        <ToastContainer toasts={toasts} dismiss={dismissToast} />
      </div>
    );
  }

  /* ─── UNLOCKED STATE ─── */
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <Unlock className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">🔐 Secret Vault</h1>
            <p className="text-slate-500 text-sm">
              {secrets.length} secret{secrets.length !== 1 ? "s" : ""} stored • Auto-locks in 5 min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Secret
          </button>
          <button
            onClick={handleLock}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors text-slate-300 text-sm font-medium"
          >
            <Lock className="w-4 h-4" />
            Lock
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-200 placeholder:text-slate-600 text-sm"
            placeholder="Search secrets..."
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filterCategory === "all"
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "bg-slate-800/50 text-slate-500 border border-slate-800 hover:text-slate-300"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat.value
                  ? `${cat.color} border border-current/30`
                  : "bg-slate-800/50 text-slate-500 border border-slate-800 hover:text-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secrets Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          Loading secrets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
            <Key className="w-8 h-8 text-slate-700" strokeWidth={1.5} />
          </div>
          <h3 className="text-slate-400 font-medium">
            {secrets.length === 0 ? "No secrets yet" : "No matching secrets"}
          </h3>
          <p className="text-slate-600 text-sm mt-1">
            {secrets.length === 0
              ? "Add your first secret to get started"
              : "Try adjusting your search or filters"}
          </p>
          {secrets.length === 0 && (
            <button
              onClick={openAddModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors"
            >
              Add Secret
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((secret) => {
            const catInfo = getCategoryInfo(secret.category);
            const CatIcon = catInfo.icon;

            return (
              <div
                key={secret.id}
                className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 hover:border-slate-700 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${catInfo.color}`}>
                      <CatIcon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-200 text-sm truncate">
                        {secret.name}
                      </h3>
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-0.5 ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                {secret.notes && (
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">{secret.notes}</p>
                )}

                <div className="text-xs text-slate-700 mb-4">
                  Added {formatDate(secret.created_at)}
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(secret)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <button
                    onClick={() => handleView(secret)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    title="View secret"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => openEditModal(secret)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingSecret(secret)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-red-900/50 rounded-md text-xs text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-200">
                {editingSecret ? "Edit Secret" : "Add Secret"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSecret(null);
                  resetForm();
                }}
                className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-200 text-sm"
                  placeholder="e.g. OpenAI API Key"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as Category)}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200 text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Secret Value</label>
                <textarea
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-200 text-sm font-mono resize-none"
                  rows={4}
                  placeholder="Paste your secret here..."
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200 text-sm"
                  placeholder="Where is this used? Expiration date?"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSecret(null);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formName.trim() || !formValue.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Encrypting...
                    </>
                  ) : editingSecret ? (
                    "Update Secret"
                  ) : (
                    "Save Secret"
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Encrypted with AES-256-GCM before leaving your browser</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {viewingSecret && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-amber-400" />
                {viewingSecret.name}
              </h2>
              <button
                onClick={() => setViewingSecret(null)}
                className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap break-all">
                {viewingSecret.value}
              </pre>
            </div>

            <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Auto-hides in 30 seconds
            </p>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deletingSecret && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200 mb-2">Delete Secret</h2>
              <p className="text-slate-500 text-sm">
                Are you sure you want to delete <strong className="text-slate-300">{deletingSecret.name}</strong>? This cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeletingSecret(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismissToast} />

      {/* Animation style */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
