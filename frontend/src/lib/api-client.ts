export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export const ACCESS_TOKEN_KEY = "mimo_access_token";

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    // En production ou derrière le BFF Next.js, on privilégie /api/v1 (same-origin + cookies HttpOnly)
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return "/api/v1";
    }
    if (!configured || configured === "/api/v1") {
      return "/api/v1";
    }
  }
  if (!configured) return "/api/v1";
  const cleaned = configured.replace(/\/+$/, "");
  return cleaned.endsWith("/api/v1") ? cleaned : `${cleaned}/api/v1`;
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
    window.localStorage.getItem("access_token")
  );
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem("access_token");
    window.localStorage.removeItem("refresh_token");
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function attemptSilentRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          setStoredAccessToken(null);
        }
        return null;
      }
      const data = (await resp.json()) as { access_token?: string };
      if (data.access_token) {
        setStoredAccessToken(data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRefresh?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, skipAuthRefresh = false, headers: customHeaders, ...rest } = options;

  const buildHeaders = (token: string | null): HeadersInit => {
    const h: Record<string, string> = {};
    if (!(body instanceof FormData)) {
      h["Content-Type"] = "application/json";
    }
    if (token) {
      h.Authorization = `Bearer ${token}`;
    }
    if (customHeaders) {
      Object.assign(h, customHeaders);
    }
    return h;
  };

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const serializedBody =
    body === undefined
      ? undefined
      : body instanceof FormData
        ? body
        : JSON.stringify(body);

  let resp = await fetch(url, {
    ...rest,
    credentials: "include",
    headers: buildHeaders(getStoredAccessToken()),
    body: serializedBody,
  });

  if (resp.status === 401 && !skipAuthRefresh) {
    const newToken = await attemptSilentRefresh();
    if (newToken) {
      resp = await fetch(url, {
        ...rest,
        credentials: "include",
        headers: buildHeaders(newToken),
        body: serializedBody,
      });
    } else if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "test" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register") &&
      !window.location.pathname.startsWith("/forgot-password") &&
      window.location.pathname !== "/"
    ) {
      const redirect = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      window.location.href = `/login?redirect=${redirect}`;
    }
  }

  if (!resp.ok) {
    let detail = `Erreur HTTP ${resp.status}`;
    try {
      const errData = (await resp.json()) as { detail?: string | Array<{ msg?: string }> };
      if (typeof errData.detail === "string") {
        detail = errData.detail;
      } else if (Array.isArray(errData.detail) && errData.detail[0]?.msg) {
        detail = errData.detail[0].msg;
      }
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(resp.status, detail);
  }

  if (resp.status === 204) {
    return undefined as T;
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await resp.json()) as T;
  }

  return (await resp.text()) as unknown as T;
}

export async function downloadBinaryFile(
  path: string,
  method: "GET" | "POST" = "POST"
): Promise<Blob> {
  const token = getStoredAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let resp = await fetch(url, {
    method,
    credentials: "include",
    headers,
  });

  if (resp.status === 401) {
    const newToken = await attemptSilentRefresh();
    if (newToken) {
      resp = await fetch(url, {
        method,
        credentials: "include",
        headers: { Authorization: `Bearer ${newToken}` },
      });
    }
  }

  if (!resp.ok) {
    throw new ApiError(resp.status, "Impossible de générer le document PDF.");
  }

  return resp.blob();
}
