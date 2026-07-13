import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

async function embedText(input: string): Promise<number[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(`${GATEWAY_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input,
    }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

async function chatComplete(messages: { role: string; content: string }[]): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please upgrade your workspace.");
    throw new Error(`AI request failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? "";
}

const SYSTEM_PROMPT = `You are PlantMD, an expert AI plant disease diagnostician and agricultural advisor.

You help farmers, gardeners, and researchers identify plant diseases, understand causes (fungal, bacterial, viral, nutritional, environmental), and recommend safe, practical treatments — prioritizing integrated pest management, organic options, and cultural practices when appropriate.

When knowledge base excerpts are provided under "CONTEXT", ground your answer in them and cite the source documents by name in a "Sources" list at the end. If the context doesn't cover the question, rely on general agricultural knowledge and clearly say so.

Format answers using markdown: short paragraphs, bold key terms, bullet lists for symptoms/treatments, and headings only when helpful. Be concise but thorough. Always suggest consulting a local agricultural extension for chemical treatments.`;

const ChatInput = z.object({
  threadId: z.string(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1),
});

export const chatRag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    let contextText = "";
    let sources: { document_id: string; title: string; similarity: number }[] = [];

    if (lastUser) {
      try {
        const embedding = await embedText(lastUser.content);
        const { data: chunks } = await context.supabase.rpc("match_document_chunks", {
          query_embedding: embedding as unknown as string,
          match_count: 5,
        });
        if (chunks && chunks.length > 0) {
          const filtered = chunks.filter((c: { similarity: number }) => c.similarity > 0.3);
          contextText = filtered
            .map(
              (c: { document_title: string; content: string }, i: number) =>
                `[${i + 1}] From "${c.document_title}":\n${c.content}`,
            )
            .join("\n\n");
          const seen = new Set<string>();
          for (const c of filtered as Array<{ document_id: string; document_title: string; similarity: number }>) {
            if (seen.has(c.document_id)) continue;
            seen.add(c.document_id);
            sources.push({ document_id: c.document_id, title: c.document_title, similarity: c.similarity });
          }
        }
      } catch (e) {
        console.error("RAG retrieval failed:", e);
      }
    }

    const systemContent = contextText
      ? `${SYSTEM_PROMPT}\n\nCONTEXT (from knowledge base):\n${contextText}`
      : SYSTEM_PROMPT;

    const reply = await chatComplete([
      { role: "system", content: systemContent },
      ...data.messages,
    ]);

    return { reply, sources };
  });

// ---------- Document ingestion ----------

function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const chunks: string[] = [];
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return chunks;
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

const IngestInput = z.object({
  documentId: z.string().uuid(),
  text: z.string().min(1),
});

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IngestInput.parse(d))
  .handler(async ({ data, context }) => {
    // Verify admin
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const chunks = chunkText(data.text);
    let inserted = 0;
    // Embed in batches of 20 to stay well under limits
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);
      const embeddings = await Promise.all(batch.map((c) => embedText(c)));
      const rows = batch.map((content, j) => ({
        document_id: data.documentId,
        chunk_index: i + j,
        content,
        embedding: embeddings[j] as unknown as string,
      }));
      const { error } = await context.supabase.from("document_chunks").insert(rows);
      if (error) throw new Error(`Insert failed: ${error.message}`);
      inserted += rows.length;
    }
    await context.supabase
      .from("documents")
      .update({ status: "ready", page_count: chunks.length })
      .eq("id", data.documentId);
    return { inserted };
  });

// ---------- User management ----------

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const adminSet = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));

    return (profiles ?? []).map((p) => ({ ...p, is_admin: adminSet.has(p.id) }));
  });

const ToggleAdminInput = z.object({ userId: z.string().uuid(), makeAdmin: z.boolean() });

export const toggleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleAdminInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    if (data.makeAdmin) {
      const { error } = await context.supabase
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Bootstrap: first authenticated user can claim admin if no admin exists.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admins } = await context.supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);
    if (admins && admins.length > 0) {
      throw new Error("An admin already exists.");
    }
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Document management ----------

const CreateDocInput = z.object({
  title: z.string().min(1),
  storagePath: z.string().min(1),
  fileSize: z.number().optional(),
});

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateDocInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        title: data.title,
        storage_path: data.storagePath,
        file_size: data.fileSize ?? null,
        uploaded_by: context.userId,
        status: "processing",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });


export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const { data, error } = await context.supabase
      .from("documents")
      .select("id, title, filename, storage_path, status, page_count, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => ({
      id: d.id as string,
      title: d.title as string,
      filename: d.filename as string,
      chunk_count: (d.page_count as number | null) ?? 0,
      status: d.status as string,
      created_at: d.created_at as string,
    }));
  });

const DeleteDocInput = z.object({ id: z.string().uuid() });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteDocInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const { data: doc } = await context.supabase
      .from("documents").select("storage_path").eq("id", data.id).maybeSingle();
    if (doc?.storage_path) {
      await context.supabase.storage.from("documents").remove([doc.storage_path as string]);
    }
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

