"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Trash2, Upload, Loader2, CheckCircle2,
  AlertCircle, Shield, Globe, Users, FileSignature, Layers, Activity,
  Eye, X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, apiUpload } from "@/lib/api";

interface Document {
  id: string;
  title: string;
  status: string;
  chunk_count: number;
  file_size: number;
  category: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

interface DocChunk {
  id: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<"docs" | "users">("docs");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const [url, setUrl] = useState("");
  const [urlUploading, setUrlUploading] = useState(false);
  const [urlUploadError, setUrlUploadError] = useState("");
  const [urlUploadSuccess, setUrlUploadSuccess] = useState("");

  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Document Chunks Modal state
  const [selectedDocForChunks, setSelectedDocForChunks] = useState<Document | null>(null);
  const [docChunks, setDocChunks] = useState<DocChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunksError, setChunksError] = useState("");

  // Check admin role
  useEffect(() => {
    if (user) {
      import("@/lib/supabase").then(({ supabase }) => {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(
            ({ data }) => {
              if (data) {
                setIsAdmin(true);
              }
              setCheckingRole(false);
            },
            () => {
              setCheckingRole(false);
            }
          );
      });
    } else if (!authLoading) {
      setCheckingRole(false);
    }
  }, [user, authLoading]);

  // Load documents
  const loadDocuments = async (silent = false) => {
    if (!silent) setLoadingDocs(true);
    try {
      const data = await apiFetch<Document[]>("/api/documents/");
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoadingDocs(false);
    }
  };

  // Load users
  const loadUsers = async (silent = false) => {
    if (!silent) setLoadingUsers(true);
    try {
      const data = await apiFetch<UserProfile[]>("/api/users/");
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoadingUsers(false);
    }
  };

  // Load both initially
  useEffect(() => {
    if (isAdmin) {
      loadDocuments();
      loadUsers();
    }
  }, [isAdmin]);

  // Poll for document updates when there are documents processing
  useEffect(() => {
    if (!isAdmin || activeTab !== "docs") return;

    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadDocuments(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, isAdmin, activeTab]);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !checkingRole && !isAdmin) {
      router.push("/dashboard");
    }
  }, [authLoading, checkingRole, isAdmin, router]);

  if (authLoading || checkingRole) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Redirecting
  }

  // Handle PDF upload
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiUpload("/api/documents/upload", formData);
      setUploadSuccess(`Successfully ingested "${file.name}"!`);
      loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  // Handle URL upload
  async function handleUrlUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setUrlUploading(true);
    setUrlUploadError("");
    setUrlUploadSuccess("");

    try {
      await apiFetch("/api/documents/upload-url", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      setUrlUploadSuccess(`Successfully ingested URL: ${url.trim()}`);
      setUrl("");
      loadDocuments();
    } catch (err: any) {
      setUrlUploadError(err.message || "Failed to ingest URL");
    } finally {
      setUrlUploading(false);
    }
  }

  // Handle delete document
  async function handleDeleteDoc(id: string) {
    if (!confirm("Are you sure you want to delete this document from the knowledge base?")) return;
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert("Failed to delete document");
    }
  }

  // Handle toggle user admin role
  async function handleToggleAdmin(targetUser: UserProfile) {
    const makeAdmin = !targetUser.is_admin;
    const confirmMsg = makeAdmin
      ? `Promote ${targetUser.email} to Admin?`
      : `Demote ${targetUser.email} from Admin?`;

    if (!confirm(confirmMsg)) return;

    try {
      await apiFetch(`/api/users/${targetUser.id}/toggle-admin`, {
        method: "POST",
        body: JSON.stringify({ makeAdmin }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_admin: makeAdmin } : u))
      );
    } catch (err: any) {
      alert(err.message || "Action failed");
    }
  }

  // Handle view document chunks
  const viewDocChunks = async (doc: Document) => {
    setSelectedDocForChunks(doc);
    setLoadingChunks(true);
    setChunksError("");
    setDocChunks([]);
    try {
      const data = await apiFetch<DocChunk[]>(`/api/documents/${doc.id}/chunks`);
      setDocChunks(data);
    } catch (err: any) {
      setChunksError(err.message || "Failed to load document chunks");
    } finally {
      setLoadingChunks(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] leaf-bg p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] transition-colors hover:bg-[var(--color-muted)] cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-3xl font-semibold">Admin Panel</h1>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Manage your knowledge base and users
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2.5 py-1 rounded-md border border-[var(--color-primary)]/20 shadow-glow">
              Dev by Mahesh
            </span>
          </div>
        </header>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-5 flex flex-col gap-1 border border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/20 transition-all hover:shadow-glow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Documents
              </span>
              <FileSignature className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{documents.length}</span>
              <span className="text-[10px] text-green-500 font-semibold">
                ({documents.filter(d => d.status === 'ready').length} Ready)
              </span>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 flex flex-col gap-1 border border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/20 transition-all hover:shadow-glow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Vector Chunks
              </span>
              <Layers className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <span className="text-2xl font-bold">
              {documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0)}
            </span>
          </div>

          <div className="glass rounded-2xl p-5 flex flex-col gap-1 border border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/20 transition-all hover:shadow-glow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Total Users
              </span>
              <Users className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <span className="text-2xl font-bold">{users.length}</span>
          </div>

          <div className="glass rounded-2xl p-5 flex flex-col gap-1 border border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/20 transition-all hover:shadow-glow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                System Status
              </span>
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-500">Active / Healthy</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-[var(--color-border)]/60 pb-px">
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "docs"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "users"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            User Management
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "docs" ? (
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* PDF Upload */}
              <div className="glass rounded-3xl p-6 flex flex-col justify-between border border-[var(--color-border)]/50">
                <div>
                  <h2 className="mb-2 font-display text-lg font-semibold">Add PDF to Knowledge Base</h2>
                  <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">
                    Uploaded PDFs will be automatically parsed, chunked, embedded, and stored in Qdrant.
                  </p>
                </div>

                <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-8 transition-colors hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-muted)]/20 min-h-[140px]">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                      <span className="text-sm font-medium">Processing PDF...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-[var(--color-muted-foreground)]" />
                      <span className="text-sm font-medium text-center">Click or drag PDF here</span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        Max: 50MB
                      </span>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-destructive)]/10 px-4 py-2.5 text-sm text-[var(--color-destructive)]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-primary)]/10 px-4 py-2.5 text-sm text-[var(--color-primary)]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{uploadSuccess}</span>
                  </div>
                )}
              </div>

              {/* URL Ingestion */}
              <div className="glass rounded-3xl p-6 flex flex-col justify-between border border-[var(--color-border)]/50">
                <div>
                  <h2 className="mb-2 font-display text-lg font-semibold">Add URL to Knowledge Base</h2>
                  <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">
                    Submit a webpage or direct PDF URL to download, index, and scrape it into the knowledge base.
                  </p>
                </div>

                <form onSubmit={handleUrlUpload} className="flex flex-col gap-3 min-h-[140px] justify-center">
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://example.com/info"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={urlUploading}
                      required
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={urlUploading || !url.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-hover)] disabled:opacity-60 cursor-pointer"
                  >
                    {urlUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Ingesting Link...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        <span>Ingest URL</span>
                      </>
                    )}
                  </button>
                </form>

                {urlUploadError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-destructive)]/10 px-4 py-2.5 text-sm text-[var(--color-destructive)]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">{urlUploadError}</span>
                  </div>
                )}

                {urlUploadSuccess && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-primary)]/10 px-4 py-2.5 text-sm text-[var(--color-primary)]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{urlUploadSuccess}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document list */}
            <div className="glass rounded-3xl p-6 border border-[var(--color-border)]/50">
              <h2 className="mb-4 font-display text-lg font-semibold">Documents</h2>
              {loadingDocs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                  No documents in the knowledge base.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        <th className="pb-3 pl-2">Name</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Chunks</th>
                        <th className="pb-3 text-right">Size</th>
                        <th className="pb-3 pr-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/40 text-[12px]">
                      {documents.map((d) => (
                        <tr key={d.id} className="hover:bg-[var(--color-muted)]/30 transition-colors">
                          <td className="py-3.5 pl-2 font-medium max-w-[240px] truncate">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                              <span className="truncate">{d.title}</span>
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              d.status === "ready"
                                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                : d.status === "processing"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                                : "bg-red-500/10 text-red-500 border border-red-500/20"
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-mono text-[11px] text-[var(--color-muted-foreground)]">
                            {d.chunk_count || 0} Chunks
                          </td>
                          <td className="py-3.5 text-right text-[var(--color-muted-foreground)]">
                            {d.file_size ? `${(d.file_size / 1024 / 1024).toFixed(2)} MB` : "—"}
                          </td>
                          <td className="py-3.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => viewDocChunks(d)}
                                disabled={d.status !== "ready"}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                aria-label="View chunks"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(d.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-destructive)] active:scale-95 transition-all cursor-pointer"
                                aria-label="Delete document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-6 border border-[var(--color-border)]/50">
            <h2 className="mb-4 font-display text-lg font-semibold">Users</h2>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      <th className="pb-3 pl-2">User Email</th>
                      <th className="pb-3">Joined Date</th>
                      <th className="pb-3">Role Status</th>
                      <th className="pb-3 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/40 text-[12px]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--color-muted)]/30 transition-colors">
                        <td className="py-3.5 pl-2 font-medium">
                          {u.email}
                        </td>
                        <td className="py-3.5 text-[var(--color-muted-foreground)]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            u.is_admin
                              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
                              : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]"
                          }`}>
                            {u.is_admin ? "Administrator" : "Standard User"}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-right">
                          <button
                            onClick={() => handleToggleAdmin(u)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                              u.is_admin
                                ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                                : "bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
                            }`}
                          >
                            <Shield className="h-3 w-3" />
                            {u.is_admin ? "Demote" : "Promote"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Document Chunks Modal */}
        {selectedDocForChunks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-[var(--color-card)] border border-[var(--color-border)]/60 rounded-3xl shadow-2xl animate-in scale-in duration-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]/40 bg-[var(--color-muted)]/20">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-semibold truncate text-[var(--color-foreground)]">
                    {selectedDocForChunks.title}
                  </h3>
                  <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                    Viewing {docChunks.length} indexed vector chunks
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDocForChunks(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingChunks ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                    <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                      Retrieving vectors from Qdrant...
                    </span>
                  </div>
                ) : chunksError ? (
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--color-destructive)]/10 px-4 py-3 text-sm text-[var(--color-destructive)]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{chunksError}</span>
                  </div>
                ) : docChunks.length === 0 ? (
                  <p className="text-center py-16 text-sm text-[var(--color-muted-foreground)]">
                    No chunks found for this document.
                  </p>
                ) : (
                  <div className="space-y-3.5">
                    {docChunks.map((chunk, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[var(--color-muted)]/30 border border-[var(--color-border)]/40 hover:border-[var(--color-border)]/80 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--color-border)]/20">
                          <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider">
                            Chunk #{chunk.chunk_index + 1}
                          </span>
                          {chunk.page_number !== null && (
                            <span className="text-[10px] font-semibold bg-[var(--color-muted)] text-[var(--color-muted-foreground)] px-2 py-0.5 rounded-md">
                              Page {chunk.page_number}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] leading-relaxed text-[var(--color-foreground)] whitespace-pre-wrap font-sans">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-[var(--color-border)]/40 bg-[var(--color-muted)]/10 flex justify-end">
                <button
                  onClick={() => setSelectedDocForChunks(null)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-muted)] hover:bg-[var(--color-border)] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
