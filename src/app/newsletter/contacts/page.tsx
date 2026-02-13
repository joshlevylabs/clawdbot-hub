"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Plus,
  Upload,
  Download,
  Search,
  Trash2,
  Pencil,
  X,
  Loader2,
  Mail,
  Check,
} from "lucide-react";
import { Newsletter } from "@/lib/newsletter-types";

interface ContactNewsletter {
  newsletter_id: string;
  newsletter_name: string;
  newsletter_slug: string;
  status: string;
}

interface Contact {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  newsletters: ContactNewsletter[];
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const [contactsRes, nlRes] = await Promise.all([
        fetch(`/api/newsletters/contacts?${params}`),
        fetch("/api/newsletters"),
      ]);

      const contactsData = await contactsRes.json();
      const nlData = await nlRes.json();

      setContacts(contactsData.contacts || []);
      setNewsletters(nlData.newsletters || []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => loadContacts(), 300);
    return () => clearTimeout(timer);
  }, [loadContacts]);

  const handleExport = async () => {
    try {
      const res = await fetch("/api/newsletters/contacts/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/newsletters/contacts/${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      setEditingContact(null);
      loadContacts();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/newsletter"
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Contacts</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {contacts.length} total contact{contacts.length !== 1 ? "s" : ""} across all newsletters
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} />
            Export
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Upload className="w-4 h-4" strokeWidth={1.5} />
            Import
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
        />
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <AddContactForm
          newsletters={newsletters}
          onClose={() => setShowAddForm(false)}
          onAdded={() => {
            setShowAddForm(false);
            loadContacts();
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          newsletters={newsletters}
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            loadContacts();
          }}
        />
      )}

      {/* Contact Detail / Edit Panel */}
      {editingContact && (
        <ContactDetail
          contact={editingContact}
          newsletters={newsletters}
          onClose={() => setEditingContact(null)}
          onUpdated={() => {
            setEditingContact(null);
            loadContacts();
          }}
          onDelete={(id) => setDeleteConfirm(id)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-slate-100 mb-2">Delete Contact</h3>
            <p className="text-sm text-slate-400 mb-6">
              This will permanently remove this contact and all their newsletter subscriptions. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      {contacts.length === 0 ? (
        <div className="bg-slate-850 rounded-xl border border-slate-800 p-12 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-300 font-medium mb-2">No contacts yet</h3>
          <p className="text-slate-500 text-sm mb-4">
            Add your first contact or import a list to get started
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary text-sm"
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div className="bg-slate-850 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Newsletters
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setEditingContact(contact)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                        <span className="text-sm text-slate-200">{contact.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {contact.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.newsletters
                          .filter((n) => n.status === "active")
                          .map((n) => (
                            <span
                              key={n.newsletter_id}
                              className="inline-flex px-2 py-0.5 text-xs rounded-full bg-primary-600/15 text-primary-400 border border-primary-500/20"
                            >
                              {n.newsletter_name}
                            </span>
                          ))}
                        {contact.newsletters.filter((n) => n.status === "active").length === 0 && (
                          <span className="text-xs text-slate-600">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingContact(contact)}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(contact.id)}
                          className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Contact Form ──
function AddContactForm({
  newsletters,
  onClose,
  onAdded,
}: {
  newsletters: Newsletter[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selectedNls, setSelectedNls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/newsletters/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          newsletter_ids: selectedNls,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add contact");
        return;
      }

      onAdded();
    } catch {
      setError("Failed to add contact");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleNl = (id: string) => {
    setSelectedNls((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-100">Add Contact</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600"
            />
          </div>
        </div>

        {newsletters.length > 0 && (
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Subscribe to newsletters
            </label>
            <div className="flex flex-wrap gap-2">
              {newsletters.map((nl) => (
                <button
                  key={nl.id}
                  type="button"
                  onClick={() => toggleNl(nl.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    selectedNls.includes(nl.id)
                      ? "bg-primary-600/20 border-primary-500/40 text-primary-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {selectedNls.includes(nl.id) && <Check className="w-3 h-3" />}
                  {nl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add Contact
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Import Modal ──
function ImportModal({
  newsletters,
  onClose,
  onImported,
}: {
  newsletters: Newsletter[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [emails, setEmails] = useState("");
  const [selectedNls, setSelectedNls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; invalid: number } | null>(null);

  const handleImport = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletters/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails,
          newsletter_ids: selectedNls,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ imported: 0, skipped: 0, invalid: -1 });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleNl = (id: string) => {
    setSelectedNls((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-100">Import Contacts</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="bg-slate-950 rounded-lg p-4 space-y-2">
              <p className="text-sm text-emerald-400">
                ✓ {result.imported} contact{result.imported !== 1 ? "s" : ""} imported
              </p>
              {result.skipped > 0 && (
                <p className="text-sm text-slate-400">
                  {result.skipped} skipped (already exist)
                </p>
              )}
              {result.invalid > 0 && (
                <p className="text-sm text-amber-400">
                  {result.invalid} invalid email{result.invalid !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              onClick={onImported}
              className="btn btn-primary text-sm w-full"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Paste emails (one per line, comma, or semicolon separated)
              </label>
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder={"email1@example.com\nemail2@example.com\nemail3@example.com"}
                rows={8}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600 font-mono resize-none"
              />
            </div>

            {newsletters.length > 0 && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Subscribe to newsletters (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {newsletters.map((nl) => (
                    <button
                      key={nl.id}
                      type="button"
                      onClick={() => toggleNl(nl.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        selectedNls.includes(nl.id)
                          ? "bg-primary-600/20 border-primary-500/40 text-primary-300"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {selectedNls.includes(nl.id) && <Check className="w-3 h-3" />}
                      {nl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={submitting || !emails.trim()}
                className="btn btn-primary text-sm flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Import
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Contact Detail Panel ──
function ContactDetail({
  contact,
  newsletters,
  onClose,
  onUpdated,
  onDelete,
}: {
  contact: Contact;
  newsletters: Newsletter[];
  onClose: () => void;
  onUpdated: () => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(contact.name || "");
  const [selectedNls, setSelectedNls] = useState<string[]>(
    contact.newsletters
      .filter((n) => n.status === "active")
      .map((n) => n.newsletter_id)
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/newsletters/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          newsletter_ids: selectedNls,
        }),
      });
      onUpdated();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleNl = (id: string) => {
    setSelectedNls((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-slate-100">Contact Details</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <p className="text-sm text-slate-200 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              {contact.email}
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Newsletter Subscriptions
            </label>
            <div className="space-y-2">
              {newsletters.map((nl) => (
                <button
                  key={nl.id}
                  type="button"
                  onClick={() => toggleNl(nl.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors ${
                    selectedNls.includes(nl.id)
                      ? "bg-primary-600/15 border-primary-500/30 text-primary-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span>{nl.name}</span>
                  {selectedNls.includes(nl.id) && (
                    <Check className="w-4 h-4 text-primary-400" />
                  )}
                </button>
              ))}
              {newsletters.length === 0 && (
                <p className="text-sm text-slate-600">No newsletters created yet</p>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-600">
            Added {new Date(contact.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              onClick={() => onDelete(contact.id)}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              Delete Contact
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary text-sm flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
