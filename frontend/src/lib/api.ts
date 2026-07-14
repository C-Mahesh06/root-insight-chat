/**
 * Typed API client for the FastAPI backend.
 * Handles authentication headers and error responses.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Redirect to /auth when the session is invalid.
 * Clears the stale Supabase session first.
 */
async function handleAuthFailure(): Promise<void> {
  try {
    const { supabase } = await import("./supabase");
    await supabase.auth.signOut();
  } catch {
    // Ignore sign-out errors
  }
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
    window.location.href = "/auth";
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Import dynamically to avoid SSR issues
  const { supabase } = await import("./supabase");

  let session = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // Stale refresh token — force re-login
      console.warn("Auth session expired:", error.message);
      await handleAuthFailure();
      return { "Content-Type": "application/json" };
    }
    session = data.session;
  } catch {
    // Network error fetching session
    session = null;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "69420",
    "bypass-tunnel-reminder": "true",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (res.status === 401 || res.status === 403) {
    // Backend rejected the token — session is stale, force re-login
    await handleAuthFailure();
    throw new ApiError("Session expired. Please sign in again.", res.status);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || "API error", res.status);
  }

  return res.json();
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  const { supabase } = await import("./supabase");

  let session = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      await handleAuthFailure();
      throw new ApiError("Session expired. Please sign in again.", 401);
    }
    session = data.session;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    session = null;
  }

  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "69420",
    "bypass-tunnel-reminder": "true",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401 || res.status === 403) {
    await handleAuthFailure();
    throw new ApiError("Session expired. Please sign in again.", res.status);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || "Upload failed", res.status);
  }

  return res.json();
}

/**
 * Stream a chat response via SSE.
 * Returns a ReadableStream that yields parsed events.
 */
export async function apiChatStream(
  message: string,
  conversationId?: string | null,
  images?: string[] | null,
  model?: string | null
): Promise<ReadableStream<{ type: string; data: unknown }>> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/api/chat/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      conversation_id: conversationId || null,
      images: images || null,
      model: model || null,
    }),
  });

  if (res.status === 401 || res.status === 403) {
    await handleAuthFailure();
    throw new ApiError("Session expired. Please sign in again.", res.status);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || "Chat failed", res.status);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            controller.enqueue(parsed);
          } catch {
            // Skip unparseable lines
          }
        }
      }
    },
  });
}
