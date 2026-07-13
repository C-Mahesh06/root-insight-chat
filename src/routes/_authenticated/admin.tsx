import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Trash2, Upload, UserCog } from "lucide-react";
import { ingestDocument, listUsers, setUserRole, listDocuments, deleteDocument } from "@/lib/rag.functions";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — PlantMD" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type DocRow = { id: string; title: string; filename: string; chunk_count: number; created_at: string };
type UserRow = { id: string; email: string; full_name: string | null; role: "admin" | "user"; created_at: string };

function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/dashboard" });
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  async function refresh() {
    setRefreshing(true);
    try {
      const [d, u] = await Promise.all([listDocuments(), listUsers()]);
      setDocs(d.documents);
      setUsers(u.users);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setUploading(true);
    const toastId = toast.loading(`Processing ${file.name}…`);
    try {
      // Upload to storage
      const path = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;

      const { chunks } = await ingestDocument({
        data: { title: file.name.replace(/\.pdf$/i, ""), filename: file.name, storagePath: path },
      });
      toast.success(`Indexed ${chunks} chunks from ${file.name}`, { id: toastId });
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg, { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteDoc(id: string) {
    try {
      await deleteDocument({ data: { id } });
      toast.success("Document deleted");
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast.error(msg);
    }
  }

  async function handleRoleChange(userId: string, role: "admin" | "user") {
    try {
      await setUserRole({ data: { userId, role } });
      toast.success("Role updated");
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update role";
      toast.error(msg);
    }
  }

  if (loading || !isAdmin) return (
    <div className="grid min-h-screen place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background leaf-bg">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="rounded-full gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <Wordmark />
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">Admin</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-4xl font-semibold">Admin panel</h1>
          <p className="mt-1 text-muted-foreground">Manage knowledge documents and user roles.</p>
        </motion.div>

        <Tabs defaultValue="docs" className="mt-8">
          <TabsList className="rounded-full bg-muted p-1">
            <TabsTrigger value="docs" className="rounded-full gap-2"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
            <TabsTrigger value="users" className="rounded-full gap-2"><UserCog className="h-4 w-4" /> Users</TabsTrigger>
          </TabsList>

          <TabsContent value="docs" className="mt-6">
            <div className="glass-strong rounded-3xl p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">Knowledge base</h2>
                  <p className="text-sm text-muted-foreground">Upload PDFs to power research-backed answers.</p>
                </div>
                <label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button asChild className="rounded-full gap-2 cursor-pointer" disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "Processing…" : "Upload PDF"}
                    </span>
                  </Button>
                </label>
              </div>

              {refreshing && docs.length === 0 ? (
                <SkeletonRows />
              ) : docs.length === 0 ? (
                <EmptyState icon={FileText} label="No documents yet. Upload a PDF to get started." />
              ) : (
                <div className="divide-y divide-border rounded-2xl border border-border bg-card/40">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{d.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {d.chunk_count} chunks · {new Date(d.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDoc(d.id)}
                        className="rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <div className="glass-strong rounded-3xl p-6">
              <div className="mb-6">
                <h2 className="font-display text-xl font-semibold">Users</h2>
                <p className="text-sm text-muted-foreground">Promote trusted members to admin.</p>
              </div>
              {refreshing && users.length === 0 ? (
                <SkeletonRows />
              ) : (
                <div className="divide-y divide-border rounded-2xl border border-border bg-card/40">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.full_name ?? u.email}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>{u.role}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")}
                        >
                          {u.role === "admin" ? "Demote" : "Promote"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/60" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
