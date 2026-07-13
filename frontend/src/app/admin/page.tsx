"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Trash2, Upload, UserCheck, ShieldAlert,
  Loader2, CheckCircle2, AlertCircle, Shield,
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

  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const data = await apiFetch<Document[]>("/api/documents/");
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Load users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await apiFetch<UserProfile[]>("/api/users/");
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === "docs") loadDocuments();
      if (activeTab === "users") loadUsers();
    }
  }, [isAdmin, activeTab]);

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

  return (
    <div className="min-h-screen bg-[var(--color-background)] leaf-bg p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] transition-colors hover:bg-[var(--color-muted)]"
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
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-[var(--color-border)]/60 pb-px">
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "docs"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
            <div className="glass rounded-3xl p-6">
              <h2 className="mb-2 font-display text-lg font-semibold">Add PDF to Knowledge Base</h2>
              <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">
                Uploaded PDFs will be automatically parsed, chunked, embedded, and stored in Qdrant.
              </p>

              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] py-8 transition-colors hover:border-[var(--color-primary)]/50">
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
                    <span className="text-sm font-medium">Processing & Embedding PDF...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-[var(--color-muted-foreground)]" />
                    <span className="text-sm font-medium">Click or drag PDF here to upload</span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      Maximum file size: 50MB
                    </span>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-destructive)]/10 px-4 py-2.5 text-sm text-[var(--color-destructive)]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-primary)]/10 px-4 py-2.5 text-sm text-[var(--color-primary)]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}
            </div>

            {/* Document list */}
            <div className="glass rounded-3xl p-6">
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
                <div className="divide-y divide-[var(--color-border)]/60">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium">{d.title}</h3>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
                            <span>Status: {d.status}</span>
                            <span>•</span>
                            <span>{d.chunk_count} chunks</span>
                            <span>•</span>
                            <span>{(d.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(d.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-destructive)]"
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Users</h2>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]/60">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-4">
                    <div>
                      <h3 className="text-sm font-medium">{u.email}</h3>
                      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        Joined: {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleAdmin(u)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border ${
                        u.is_admin
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {u.is_admin ? "Admin" : "Promote"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
