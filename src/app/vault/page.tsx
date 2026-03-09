"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
  ShieldCheck,
  ShieldOff,
  Key,
  KeyRound,
  FileKey,
  Award,
  Hash,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  Palette,
  Loader2,
  RefreshCw,
  Calendar,
  Calculator,
  ExternalLink,
  History,
  Receipt,
} from "lucide-react";
import { encrypt, decrypt } from "@/lib/vault-crypto";

// Tax components and types
import TaxDashboard from "../taxes/components/TaxDashboard";
import TaxEstimator from "../taxes/components/TaxEstimator";
import ImportantLinks from "../taxes/components/ImportantLinks";
import TaxHistory from "../taxes/components/TaxHistory";
import { formatCurrency, formatDate as formatTaxDate, daysSince, daysUntil } from "../taxes/utils";

// Tax types
interface TaxEstimate {
  id: string;
  year: number;
  quarter: number | null;
  type: 'federal' | 'state';
  estimated_amount: number | null;
  actual_amount: number | null;
  paid_date: string | null;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TaxContact {
  id: string;
  name: string;
  role: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface TaxDeadline {
  id: string;
  year: number;
  form_type: string;
  description: string;
  due_date: string;
  status: 'upcoming' | 'filed' | 'extended';
  notes: string | null;
  created_at: string;
}

interface TaxHistoryRecord {
  id: string;
  year: number;
  filing_type: 'personal' | 's-corp';
  gross_revenue: number | null;
  net_profit: number | null;
  federal_tax_owed: number | null;
  state_tax_owed: number | null;
  total_paid: number | null;
  refund_amount: number | null;
  accountant_estimate: number | null;
  notes: string | null;
  created_at: string;
}

interface TaxData {
  estimates: TaxEstimate[];
  contacts: TaxContact[];
  deadlines: TaxDeadline[];
  history: TaxHistoryRecord[];
  timestamp: string;
}

/* ─── Types ─── */
interface Secret {
  id: string;
  name: string;
  category: string;
  application: string | null;
  encrypted_value: string;
  iv: string;
  salt: string;
  notes: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

type Category = "api_key" | "token" | "password" | "ssh_key" | "certificate" | "secret" | "address" | "id" | "other";

const CATEGORIES: { value: Category; label: string; color: string; icon: typeof Key }[] = [
  { value: "api_key", label: "API Key", color: "bg-blue-500/20 text-blue-400", icon: Key },
  { value: "token", label: "Token", color: "bg-purple-500/20 text-purple-400", icon: Hash },
  { value: "password", label: "Password", color: "bg-amber-500/20 text-amber-400", icon: Lock },
  { value: "ssh_key", label: "SSH Key", color: "bg-emerald-500/20 text-emerald-400", icon: FileKey },
  { value: "certificate", label: "Certificate", color: "bg-rose-500/20 text-rose-400", icon: Award },
  { value: "secret", label: "Secret", color: "bg-indigo-500/20 text-indigo-400", icon: EyeOff },
  { value: "address", label: "Address", color: "bg-cyan-500/20 text-cyan-400", icon: FolderOpen },
  { value: "id", label: "ID", color: "bg-orange-500/20 text-orange-400", icon: Shield },
  { value: "other", label: "Other", color: "bg-slate-500/20 text-slate-400", icon: KeyRound },
];

const PRESET_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#a855f7" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Slate", value: "#64748b" },
];

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function getCategoryInfo(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
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

/* ─── TOTP Status ─── */
interface TOTPStatus {
  enabled: boolean;
  setupRequired: boolean;
  verified: boolean;
}

/* ─── Main Component ─── */
export default function VaultPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  // TOTP state
  const [totpLoading, setTotpLoading] = useState(true);
  const [totpStatus, setTotpStatus] = useState<TOTPStatus | null>(null);
  const [totpSetupUri, setTotpSetupUri] = useState<string | null>(null);
  const [totpSetupSecret, setTotpSetupSecret] = useState<string | null>(null);
  const [totpQrDataUrl, setTotpQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");
  const [totpSubmitting, setTotpSubmitting] = useState(false);
  const [totpSetupStarted, setTotpSetupStarted] = useState(false);

  // 2FA settings in unlocked view
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disabling2FA, setDisabling2FA] = useState(false);

  // Auth & state
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterApplications, setFilterApplications] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [appDropdownOpen, setAppDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const appDropdownRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [viewingSecret, setViewingSecret] = useState<{ name: string; value: string } | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<Secret | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Secret Form
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<Category>("api_key");
  const [formValue, setFormValue] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formApplication, setFormApplication] = useState("");
  const [formProjectId, setFormProjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Project Form
  const [projName, setProjName] = useState("");
  const [projDescription, setProjDescription] = useState("");
  const [projColor, setProjColor] = useState("#3b82f6");
  const [savingProject, setSavingProject] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Auto-lock timer
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tax state
  const [taxData, setTaxData] = useState<TaxData | null>(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [activeTaxTab, setActiveTaxTab] = useState<"dashboard" | "estimator" | "links" | "history">("dashboard");

  // Top-level tab state - check URL parameter
  const [activeMainTab, setActiveMainTab] = useState<"secrets" | "taxes">(
    tabParam === "taxes" ? "taxes" : "secrets"
  );

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── TOTP check on page load ───
  useEffect(() => {
    async function checkTOTP() {
      try {
        const res = await fetch("/api/vault/totp");
        if (!res.ok) {
          // If API fails (e.g. table doesn't exist), skip TOTP
          setTotpStatus({ enabled: false, setupRequired: false, verified: true });
          return;
        }
        const data = await res.json();
        setTotpStatus(data);
      } catch {
        // Network error — skip TOTP gate
        setTotpStatus({ enabled: false, setupRequired: false, verified: true });
      } finally {
        setTotpLoading(false);
      }
    }
    checkTOTP();
  }, []);

  // ─── TOTP Setup: Start ───
  const handleTotpSetup = async () => {
    setTotpSubmitting(true);
    setTotpError("");
    try {
      const res = await fetch("/api/vault/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");

      setTotpSetupUri(data.uri);
      setTotpSetupSecret(data.secret);
      setTotpSetupStarted(true);

      // Generate QR code client-side
      const QRCode = (await import("qrcode")).default;
      const qrUrl = await QRCode.toDataURL(data.uri, {
        width: 256,
        margin: 2,
        color: { dark: "#e2e8f0", light: "#00000000" },
      });
      setTotpQrDataUrl(qrUrl);
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : "Failed to start setup");
    } finally {
      setTotpSubmitting(false);
    }
  };

  // ─── TOTP Setup: Verify first code ───
  const handleTotpVerify = async () => {
    if (totpCode.length !== 6) return;
    setTotpSubmitting(true);
    setTotpError("");
    try {
      const res = await fetch("/api/vault/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      // Success — TOTP is now enabled and verified
      setTotpStatus({ enabled: true, setupRequired: false, verified: true });
      setTotpCode("");
      toast("Two-factor authentication enabled!", "success");
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : "Invalid code");
      setTotpCode("");
    } finally {
      setTotpSubmitting(false);
    }
  };

  // ─── TOTP Gate: Validate code ───
  const handleTotpValidate = async () => {
    if (totpCode.length !== 6) return;
    setTotpSubmitting(true);
    setTotpError("");
    try {
      const res = await fetch("/api/vault/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", token: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");

      // Success — proceed to master password
      setTotpStatus((prev) => prev ? { ...prev, verified: true } : prev);
      setTotpCode("");
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : "Invalid code");
      setTotpCode("");
    } finally {
      setTotpSubmitting(false);
    }
  };

  // ─── Disable 2FA ───
  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) return;
    setDisabling2FA(true);
    try {
      const res = await fetch("/api/vault/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", token: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disable");

      setTotpStatus({ enabled: false, setupRequired: true, verified: false });
      setShowDisable2FA(false);
      setDisableCode("");
      toast("Two-factor authentication disabled", "info");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to disable 2FA", "error");
      setDisableCode("");
    } finally {
      setDisabling2FA(false);
    }
  };

  // Reset idle timer on interaction
  const resetIdleTimer = useCallback(() => {
    if (!masterPassword) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setMasterPassword(null);
      setSecrets([]);
      setProjects([]);
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

  // Load tax data when taxes tab is opened for the first time
  useEffect(() => {
    if (activeMainTab === "taxes" && !taxData && !taxLoading && !taxError) {
      loadTaxData();
    }
  }, [activeMainTab, taxData, taxLoading, taxError]);

  // Fetch secrets
  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const [secretsRes, projectsRes] = await Promise.all([
        fetch("/api/vault"),
        fetch("/api/vault/projects"),
      ]);
      if (!secretsRes.ok) throw new Error("Failed to fetch secrets");
      if (!projectsRes.ok) throw new Error("Failed to fetch projects");
      const secretsData = await secretsRes.json();
      const projectsData = await projectsRes.json();
      setSecrets(secretsData.secrets || []);
      setProjects(projectsData.projects || []);
    } catch {
      toast("Failed to load vault data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load tax data
  const loadTaxData = async () => {
    setTaxLoading(true);
    setTaxError(null);
    
    try {
      // For now, use fallback mock data (same as original taxes page)
      const mockData: TaxData = {
        estimates: [
          {
            id: "1",
            year: 2025,
            quarter: 1,
            type: "federal",
            estimated_amount: 15000,
            actual_amount: null,
            paid_date: null,
            due_date: "2025-04-15",
            status: "pending",
            notes: "Q1 2025 estimated payment",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z"
          },
          {
            id: "2",
            year: 2025,
            quarter: 1,
            type: "state",
            estimated_amount: 5000,
            actual_amount: null,
            paid_date: null,
            due_date: "2025-04-15",
            status: "pending",
            notes: "CA Q1 2025 estimated payment",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z"
          }
        ],
        contacts: [
          {
            id: "1",
            name: "Nick Jackson",
            role: "accountant",
            company: "Trusted Tax Services LLC",
            email: "nick@trustedtaxservicesllc.com",
            phone: "(619) 514-4262",
            address: "7777 Alvarado Rd., Suite 202, La Mesa, CA 91942",
            notes: "Primary accountant for Josh Levy Labs Inc S-Corp filings",
            created_at: "2025-01-01T00:00:00Z"
          },
          {
            id: "2",
            name: "Robin Frey",
            role: "bookkeeper",
            company: "La Mesa Bookkeeping LLC",
            email: "robin@lamesabookkeepingllc.com",
            phone: null,
            address: null,
            notes: "Monthly bookkeeping services for Josh Levy Labs Inc",
            created_at: "2025-01-01T00:00:00Z"
          }
        ],
        deadlines: [
          {
            id: "1",
            year: 2025,
            form_type: "1120-S",
            description: "S-Corp Tax Return (Josh Levy Labs Inc)",
            due_date: "2025-03-15",
            status: "upcoming",
            notes: null,
            created_at: "2025-01-01T00:00:00Z"
          },
          {
            id: "2",
            year: 2025,
            form_type: "1040",
            description: "Personal Tax Return",
            due_date: "2025-04-15",
            status: "upcoming",
            notes: null,
            created_at: "2025-01-01T00:00:00Z"
          },
          {
            id: "3",
            year: 2025,
            form_type: "quarterly-estimate",
            description: "Q1 Estimated Tax Payments",
            due_date: "2025-04-15",
            status: "upcoming",
            notes: "Federal and CA state quarterly estimates",
            created_at: "2025-01-01T00:00:00Z"
          }
        ],
        history: [
          {
            id: "3",
            year: 2024,
            filing_type: "s-corp",
            gross_revenue: 198752,
            net_profit: 84884,
            federal_tax_owed: -3024,
            state_tax_owed: null,
            total_paid: 37648,
            refund_amount: 3024,
            accountant_estimate: null,
            notes: "S-Corp gross receipts $198,752, officer compensation $63,333, received federal refund",
            created_at: "2024-04-15T00:00:00Z"
          },
          {
            id: "2",
            year: 2023,
            filing_type: "s-corp",
            gross_revenue: 207784,
            net_profit: 75460,
            federal_tax_owed: 2870,
            state_tax_owed: null,
            total_paid: 20689,
            refund_amount: null,
            accountant_estimate: null,
            notes: "S-Corp gross receipts $207,784, officer compensation $54,415, owed $2,870 to IRS",
            created_at: "2023-04-15T00:00:00Z"
          },
          {
            id: "1",
            year: 2022,
            filing_type: "s-corp",
            gross_revenue: 272297,
            net_profit: 91953,
            federal_tax_owed: 17764,
            state_tax_owed: null,
            total_paid: null,
            refund_amount: null,
            accountant_estimate: null,
            notes: "S-Corp gross receipts $272,297, officer compensation $12,000, owed $17,764 to IRS",
            created_at: "2022-04-15T00:00:00Z"
          }
        ],
        timestamp: new Date().toISOString()
      };

      setTaxData(mockData);
    } catch (err) {
      console.error("Error loading tax data:", err);
      setTaxError("Failed to load tax data");
    } finally {
      setTaxLoading(false);
    }
  };

  // On unlock
  const handleUnlock = async () => {
    if (!passwordInput.trim()) return;
    setUnlocking(true);

    try {
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
    setProjects([]);
    setSearch("");
    setFilterCategories([]);
    setFilterProjects([]);
    setFilterApplications([]);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    toast("Vault locked", "info");
  };

  // ─── Secret CRUD ───
  const resetForm = () => {
    setFormName("");
    setFormCategory("api_key");
    setFormValue("");
    setFormNotes("");
    setFormApplication("");
    setFormProjectId("");
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
    setFormApplication(secret.application || "");
    setFormProjectId(secret.project_id || "");
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
        application: formApplication.trim() || null,
        encrypted_value: encrypted,
        iv,
        salt,
        notes: formNotes.trim() || null,
        project_id: formProjectId || null,
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
      setTimeout(async () => {
        try { await navigator.clipboard.writeText(""); } catch {}
      }, 30_000);
    } catch {
      toast("Failed to decrypt — wrong master password?", "error");
    }
  };

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
      setTimeout(() => setViewingSecret(null), 30_000);
    } catch {
      toast("Failed to decrypt — wrong master password?", "error");
    }
  };

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

  // ─── Project CRUD ───
  const resetProjectForm = () => {
    setProjName("");
    setProjDescription("");
    setProjColor("#3b82f6");
  };

  const openAddProjectModal = () => {
    resetProjectForm();
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project: Project) => {
    setProjName(project.name);
    setProjDescription(project.description || "");
    setProjColor(project.color);
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    if (!projName.trim()) return;
    setSavingProject(true);

    try {
      const payload = {
        name: projName.trim(),
        description: projDescription.trim() || null,
        color: projColor,
        icon: "folder",
      };

      if (editingProject) {
        const res = await fetch("/api/vault/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingProject.id }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast("Project updated", "success");
      } else {
        const res = await fetch("/api/vault/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast("Project created", "success");
      }

      setShowProjectModal(false);
      resetProjectForm();
      setEditingProject(null);
      await fetchSecrets();
    } catch {
      toast("Failed to save project", "error");
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      const res = await fetch(`/api/vault/projects?id=${deletingProject.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Project deleted — secrets unassigned", "success");
      setDeletingProject(null);
      setFilterProjects((prev) => prev.filter((p) => p !== deletingProject.id));
      await fetchSecrets();
    } catch {
      toast("Failed to delete project", "error");
    }
  };

  // ─── Helpers ───
  const getProjectById = (id: string | null) => projects.find((p) => p.id === id) || null;

  const getSecretCountForProject = (projectId: string | null) =>
    secrets.filter((s) => (projectId === null ? !s.project_id : s.project_id === projectId)).length;

  // Unique applications for filter
  const uniqueApplications = Array.from(
    new Set(secrets.map((s) => s.application).filter((a): a is string => !!a))
  ).sort();

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (appDropdownRef.current && !appDropdownRef.current.contains(e.target as Node)) {
        setAppDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle helpers for multi-select
  const toggleCategory = (cat: string) => {
    setFilterCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };
  const toggleProject = (projId: string) => {
    setFilterProjects((prev) =>
      prev.includes(projId) ? prev.filter((p) => p !== projId) : [...prev, projId]
    );
  };
  const toggleApplication = (app: string) => {
    setFilterApplications((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  // Filter secrets
  const filtered = secrets.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filterCategories.length === 0 || filterCategories.includes(s.category);
    const matchProject =
      filterProjects.length === 0 ||
      (filterProjects.includes("unassigned") && !s.project_id) ||
      filterProjects.includes(s.project_id || "");
    const matchApplication =
      filterApplications.length === 0 || filterApplications.includes(s.application || "");
    return matchSearch && matchCategory && matchProject && matchApplication;
  });

  /* ─── LOADING STATE ─── */
  if (totpLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading vault security...</p>
        </div>
        <ToastContainer toasts={toasts} dismiss={dismissToast} />
      </div>
    );
  }

  /* ─── TOTP SETUP STATE ─── */
  if (totpStatus?.setupRequired) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 border border-emerald-800/50">
              <ShieldCheck className="w-10 h-10 text-emerald-400" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-semibold text-slate-100">Set Up Two-Factor Auth</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Protect your vault with Google Authenticator
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            {!totpSetupStarted ? (
              /* Step 1: Start setup */
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400 space-y-2">
                  <p>Two-factor authentication adds an extra layer of security to your vault.</p>
                  <p>You&apos;ll need an authenticator app like:</p>
                  <ul className="list-disc list-inside text-slate-500 space-y-1">
                    <li>Google Authenticator</li>
                    <li>Authy</li>
                    <li>1Password</li>
                  </ul>
                </div>
                <button
                  onClick={handleTotpSetup}
                  disabled={totpSubmitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors font-medium text-white flex items-center justify-center gap-2"
                >
                  {totpSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Set Up 2FA
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    // Skip setup — mark as not required so user goes to master password
                    setTotpStatus({ enabled: false, setupRequired: false, verified: true });
                  }}
                  className="w-full py-2 text-slate-600 hover:text-slate-400 text-sm transition-colors"
                >
                  Skip for now
                </button>
                {totpError && (
                  <p className="text-red-400 text-sm text-center flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {totpError}
                  </p>
                )}
              </div>
            ) : (
              /* Step 2: QR code + verify */
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-4">
                    Scan this QR code with your authenticator app:
                  </p>
                  {totpQrDataUrl ? (
                    <div className="inline-block bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                      <img
                        src={totpQrDataUrl}
                        alt="TOTP QR Code"
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 mx-auto bg-slate-800 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
                    </div>
                  )}
                </div>

                {totpSetupSecret && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1.5">Or enter manually:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-slate-300 break-all flex-1">
                        {totpSetupSecret.replace(/(.{4})/g, "$1 ").trim()}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(totpSetupSecret);
                          toast("Secret key copied", "success");
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors shrink-0"
                        title="Copy secret key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Enter the 6-digit code from your app:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setTotpCode(v);
                      setTotpError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && totpCode.length === 6 && handleTotpVerify()}
                    className="w-full px-4 py-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-slate-200 text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-700 placeholder:tracking-normal placeholder:text-base"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                {totpError && (
                  <p className="text-red-400 text-sm text-center flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {totpError}
                  </p>
                )}

                <button
                  onClick={handleTotpVerify}
                  disabled={totpSubmitting || totpCode.length !== 6}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors font-medium text-white flex items-center justify-center gap-2"
                >
                  {totpSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Verify &amp; Enable
                    </>
                  )}
                </button>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-start gap-2 text-xs text-amber-600">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Save your secret key safely. You&apos;ll need it if you lose access to your authenticator app.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ToastContainer toasts={toasts} dismiss={dismissToast} />
      </div>
    );
  }

  /* ─── TOTP GATE STATE ─── */
  if (totpStatus?.enabled && !totpStatus?.verified) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 border border-blue-800/50">
              <Shield className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-semibold text-slate-100">Two-Factor Authentication</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTotpCode(v);
                    setTotpError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && totpCode.length === 6 && handleTotpValidate()}
                  className="w-full px-4 py-4 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-200 text-center text-3xl tracking-[0.5em] font-mono placeholder:text-slate-700 placeholder:tracking-normal placeholder:text-base"
                  placeholder="Enter code"
                  autoFocus
                />
              </div>

              {totpError && (
                <p className="text-red-400 text-sm text-center flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {totpError}
                </p>
              )}

              <button
                onClick={handleTotpValidate}
                disabled={totpSubmitting || totpCode.length !== 6}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors font-medium text-white flex items-center justify-center gap-2"
              >
                {totpSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Verify
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Code refreshes every 30 seconds. The verification is valid for 10 minutes.</span>
              </div>
            </div>
          </div>
        </div>

        <ToastContainer toasts={toasts} dismiss={dismissToast} />
      </div>
    );
  }

  /* ─── LOCKED STATE (Master Password) ─── */
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
            {totpStatus?.enabled && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-500">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2FA verified</span>
              </div>
            )}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <Unlock className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">🔐 Secure Vault</h1>
            <p className="text-slate-500 text-sm">
              {activeMainTab === "secrets" 
                ? `${secrets.length} secret${secrets.length !== 1 ? "s" : ""} • ${projects.length} project${projects.length !== 1 ? "s" : ""}`
                : "Tax & financial data management"
              } • Auto-locks in 5 min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 2FA Status Badge */}
          {totpStatus?.enabled ? (
            <button
              onClick={() => setShowDisable2FA(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800/50 rounded-lg transition-colors text-emerald-400 text-xs font-medium"
              title="2FA Settings"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              2FA On
            </button>
          ) : (
            <button
              onClick={() => {
                setTotpStatus({ enabled: false, setupRequired: true, verified: false });
                setTotpSetupStarted(false);
                setTotpSetupUri(null);
                setTotpSetupSecret(null);
                setTotpQrDataUrl(null);
                setTotpCode("");
                setMasterPassword(null);
                setSecrets([]);
                setProjects([]);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors text-slate-500 hover:text-slate-300 text-xs font-medium"
              title="Enable 2FA"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              2FA Off
            </button>
          )}
          {activeMainTab === "secrets" && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Secret
            </button>
          )}
          <button
            onClick={handleLock}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors text-slate-300 text-sm font-medium"
          >
            <Lock className="w-4 h-4" />
            Lock
          </button>
        </div>
      </div>

      {/* Top-Level Tab Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveMainTab("secrets")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all text-sm font-medium ${
            activeMainTab === "secrets"
              ? "bg-[#D4A020]/15 border border-[#D4A020]/30 text-[#D4A020]"
              : "bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <Lock className="w-4 h-4" />
          🔐 Secrets
        </button>
        <button
          onClick={() => setActiveMainTab("taxes")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all text-sm font-medium ${
            activeMainTab === "taxes"
              ? "bg-[#D4A020]/15 border border-[#D4A020]/30 text-[#D4A020]"
              : "bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <div className="w-4 h-4 flex items-center justify-center">📊</div>
          Taxes
        </button>
      </div>

      {/* Content based on active tab */}
      {activeMainTab === "secrets" && (
        <>
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-200 placeholder:text-slate-600 text-sm"
            placeholder="Search secrets..."
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative" ref={categoryDropdownRef}>
          <button
            onClick={() => { setCategoryDropdownOpen((v) => !v); setProjectDropdownOpen(false); setAppDropdownOpen(false); }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
              filterCategories.length > 0
                ? "bg-blue-600/15 border-blue-500/30 text-blue-400"
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Key className="w-4 h-4" />
            Category
            {filterCategories.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-500/20 rounded-full">
                {filterCategories.length}
              </span>
            )}
            <svg className={`w-3.5 h-3.5 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {categoryDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1.5 max-h-72 overflow-y-auto">
              {filterCategories.length > 0 && (
                <button
                  onClick={() => setFilterCategories([])}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:text-blue-400 transition-colors"
                >
                  Clear all
                </button>
              )}
              {CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const isSelected = filterCategories.includes(cat.value);
                const count = secrets.filter((s) => s.category === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => toggleCategory(cat.value)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/70 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-blue-600 border-blue-500" : "border-slate-600"
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <CatIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-blue-400" : "text-slate-500"}`} />
                    <span className={`text-sm flex-1 text-left ${isSelected ? "text-slate-200" : "text-slate-400"}`}>
                      {cat.label}
                    </span>
                    <span className="text-xs text-slate-600">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Project Dropdown */}
        {projects.length > 0 && (
          <div className="relative" ref={projectDropdownRef}>
            <button
              onClick={() => { setProjectDropdownOpen((v) => !v); setCategoryDropdownOpen(false); setAppDropdownOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
                filterProjects.length > 0
                  ? "bg-purple-600/15 border-purple-500/30 text-purple-400"
                  : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Project
              {filterProjects.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-purple-500/20 rounded-full">
                  {filterProjects.length}
                </span>
              )}
              <svg className={`w-3.5 h-3.5 transition-transform ${projectDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {projectDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1.5 max-h-72 overflow-y-auto">
                {filterProjects.length > 0 && (
                  <button
                    onClick={() => setFilterProjects([])}
                    className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:text-purple-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                {projects.map((proj) => {
                  const isSelected = filterProjects.includes(proj.id);
                  const count = getSecretCountForProject(proj.id);
                  return (
                    <button
                      key={proj.id}
                      onClick={() => toggleProject(proj.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/70 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-purple-600 border-purple-500" : "border-slate-600"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: proj.color }}
                      />
                      <span className={`text-sm flex-1 text-left ${isSelected ? "text-slate-200" : "text-slate-400"}`}>
                        {proj.name}
                      </span>
                      <span className="text-xs text-slate-600">{count}</span>
                    </button>
                  );
                })}
                {secrets.some((s) => !s.project_id) && (
                  <button
                    onClick={() => toggleProject("unassigned")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/70 transition-colors border-t border-slate-800 mt-1 pt-2"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      filterProjects.includes("unassigned") ? "bg-purple-600 border-purple-500" : "border-slate-600"
                    }`}>
                      {filterProjects.includes("unassigned") && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <span className={`text-sm flex-1 text-left ${filterProjects.includes("unassigned") ? "text-slate-200" : "text-slate-500"}`}>
                      Unassigned
                    </span>
                    <span className="text-xs text-slate-600">{getSecretCountForProject(null)}</span>
                  </button>
                )}
                <div className="border-t border-slate-800 mt-1.5 pt-1.5">
                  <button
                    onClick={() => { setProjectDropdownOpen(false); openAddProjectModal(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Project
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Application Dropdown */}
        {uniqueApplications.length > 0 && (
          <div className="relative" ref={appDropdownRef}>
            <button
              onClick={() => { setAppDropdownOpen((v) => !v); setCategoryDropdownOpen(false); setProjectDropdownOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
                filterApplications.length > 0
                  ? "bg-teal-600/15 border-teal-500/30 text-teal-400"
                  : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Application
              {filterApplications.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-teal-500/20 rounded-full">
                  {filterApplications.length}
                </span>
              )}
              <svg className={`w-3.5 h-3.5 transition-transform ${appDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {appDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1.5 max-h-72 overflow-y-auto">
                {filterApplications.length > 0 && (
                  <button
                    onClick={() => setFilterApplications([])}
                    className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:text-teal-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                {uniqueApplications.map((app) => {
                  const isSelected = filterApplications.includes(app);
                  const count = secrets.filter((s) => s.application === app).length;
                  return (
                    <button
                      key={app}
                      onClick={() => toggleApplication(app)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/70 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-teal-600 border-teal-500" : "border-slate-600"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                      <span className={`text-sm flex-1 text-left ${isSelected ? "text-slate-200" : "text-slate-400"}`}>
                        {app}
                      </span>
                      <span className="text-xs text-slate-600">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Active filter badges */}
        {(filterCategories.length > 0 || filterProjects.length > 0 || filterApplications.length > 0) && (
          <button
            onClick={() => { setFilterCategories([]); setFilterProjects([]); setFilterApplications([]); }}
            className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
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
            const project = getProjectById(secret.project_id);

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
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                        {secret.application && (
                          <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400">
                            {secret.application}
                          </span>
                        )}
                        {project && (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${project.color}15`,
                              color: project.color,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                          </span>
                        )}
                      </div>
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

      {/* ── Add/Edit Secret Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-sm text-slate-400 mb-1.5">Project</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200 text-sm"
                  >
                    <option value="">No Project</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Application (optional)</label>
                <input
                  type="text"
                  value={formApplication}
                  onChange={(e) => setFormApplication(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200 text-sm"
                  placeholder="e.g. YouTube, Kalshi, OpenAI..."
                />
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

      {/* ── Project Modal ── */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-400" />
                {editingProject ? "Edit Project" : "New Project"}
              </h2>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                  resetProjectForm();
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
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-200 text-sm"
                  placeholder="e.g. JoshOS Hub"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={projDescription}
                  onChange={(e) => setProjDescription(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200 text-sm"
                  placeholder="Brief description of this project"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-slate-400 mb-2">
                  <Palette className="w-3.5 h-3.5" />
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setProjColor(c.value)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        projColor === c.value
                          ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                    resetProjectForm();
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={savingProject || !projName.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {savingProject ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : editingProject ? (
                    "Update Project"
                  ) : (
                    "Create Project"
                  )}
                </button>
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

      {/* ── Delete Secret Confirmation ── */}
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

      {/* ── Delete Project Confirmation ── */}
      {deletingProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200 mb-2">Delete Project</h2>
              <p className="text-slate-500 text-sm">
                Delete <strong className="text-slate-300">{deletingProject.name}</strong>? Secrets in this project will become unassigned (not deleted).
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeletingProject(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Disable 2FA Modal ── */}
      {showDisable2FA && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                2FA Settings
              </h2>
              <button
                onClick={() => {
                  setShowDisable2FA(false);
                  setDisableCode("");
                }}
                className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-900/20 rounded-lg p-3 border border-emerald-800/30">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Two-Factor Authentication</p>
                  <p className="text-xs text-emerald-500">Currently enabled</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <p className="text-sm text-slate-400 mb-3">
                  To disable 2FA, enter your current authenticator code:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && disableCode.length === 6 && handleDisable2FA()}
                  className="w-full px-4 py-3 bg-slate-800 rounded-lg border border-slate-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 text-slate-200 text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-700 placeholder:tracking-normal placeholder:text-base"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDisable2FA(false);
                    setDisableCode("");
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={disabling2FA || disableCode.length !== 6}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {disabling2FA ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    <>
                      <ShieldOff className="w-4 h-4" />
                      Disable 2FA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Taxes Content */}
      {activeMainTab === "taxes" && (
        <div className="space-y-6">
          {/* Tax Header Info */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4A020]/20 text-[#D4A020] flex items-center gap-1">
                  <div className="w-3 h-3 flex items-center justify-center">🏢</div>
                  Josh Levy Labs Inc (S-Corp)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadTaxData();
                }}
                disabled={taxLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#D4A020] hover:bg-[#D4A020]/80 rounded-lg transition-colors disabled:opacity-50 text-sm text-slate-900 font-medium"
              >
                <div className={`w-3.5 h-3.5 ${taxLoading ? "animate-spin" : ""}`}>🔄</div>
                Refresh
              </button>
            </div>
          </div>

          {/* Tax Sub-Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {[
              { key: "dashboard", label: "Dashboard", icon: "📅" },
              { key: "estimator", label: "Tax Estimator", icon: "🧮" },
              { key: "links", label: "Links & Contacts", icon: "🔗" },
              { key: "history", label: "History", icon: "📜" },
            ].map((tab) => {
              const isActive = activeTaxTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTaxTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-[#D4A020]/15 text-[#D4A020] border border-[#D4A020]/30"
                      : "bg-transparent text-slate-500 border border-transparent hover:text-slate-300"
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tax Content */}
          {taxLoading && (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 text-[#D4A020] animate-spin">🔄</div>
            </div>
          )}

          {!taxLoading && taxError && (
            <div className="flex items-center justify-center py-24">
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
                <div className="w-8 h-8 mx-auto mb-3 text-red-400">⚠️</div>
                <p className="text-red-300">{taxError}</p>
                <button onClick={loadTaxData} className="mt-4 px-4 py-2 bg-[#D4A020] rounded-lg text-sm text-slate-900 font-medium">
                  Retry
                </button>
              </div>
            </div>
          )}

          {!taxLoading && !taxError && taxData && (
            <div className="space-y-6">
              {activeTaxTab === "dashboard" && <TaxDashboard data={taxData} />}
              {activeTaxTab === "estimator" && <TaxEstimator data={taxData} />}
              {activeTaxTab === "links" && <ImportantLinks data={taxData} />}
              {activeTaxTab === "history" && <TaxHistory data={taxData} />}
            </div>
          )}

          {!taxLoading && !taxError && !taxData && (
            <div className="text-center py-16 text-slate-500">
              <div className="w-16 h-16 mx-auto bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
                <div className="text-2xl">📊</div>
              </div>
              <h3 className="text-slate-400 font-medium">No Tax Data</h3>
              <p className="text-slate-600 text-sm mt-1">
                Click Refresh to load tax information
              </p>
              <button
                onClick={loadTaxData}
                className="mt-4 px-4 py-2 bg-[#D4A020] hover:bg-[#D4A020]/80 rounded-lg text-sm text-slate-900 font-medium"
              >
                Load Tax Data
              </button>
            </div>
          )}
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
