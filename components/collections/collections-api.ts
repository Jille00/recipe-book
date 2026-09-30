/**
 * Browser-side calls to /api/collections. Each resolves to the parsed body on
 * success or a message fit for the person on failure, never throws.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(url: string, init: RequestInit, fallback: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Not JSON (an HTML error page, for example).
    }
    if (!res.ok) {
      const message =
        res.status === 401
          ? "Your session has expired. Please sign in again."
          : (body as { error?: unknown } | null)?.error;
      return {
        ok: false,
        status: res.status,
        error: typeof message === "string" && message ? message : fallback,
      };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: `${fallback}. Check your connection.` };
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export interface CreatedCollection {
  id: string;
  name: string;
  createdAt: string | null;
  updatedAt: string | null;
  recipeCount: number;
  coverImageUrl: string | null;
}

export const createCollectionRequest = (name: string) =>
  call<CreatedCollection>("/api/collections", json("POST", { name }), "Couldn't create the collection");

export const renameCollectionRequest = (id: string, name: string) =>
  call<{ id: string; name: string }>(
    `/api/collections/${id}`,
    json("PATCH", { name }),
    "Couldn't rename the collection"
  );

export const deleteCollectionRequest = (id: string) =>
  call<{ success: true }>(`/api/collections/${id}`, { method: "DELETE" }, "Couldn't delete the collection");

export const addToCollectionRequest = (id: string, recipeId: string) =>
  call<{ success: true }>(
    `/api/collections/${id}/recipes`,
    json("POST", { recipeId }),
    "Couldn't add the recipe back"
  );

export const removeFromCollectionRequest = (id: string, recipeId: string) =>
  call<{ success: true }>(
    `/api/collections/${id}/recipes/${recipeId}`,
    { method: "DELETE" },
    "Couldn't remove the recipe"
  );
