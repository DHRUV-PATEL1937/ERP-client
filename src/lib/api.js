let token = null;
export const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");
export function setToken(value) {
  token = value;
}
export async function api(
  path,
  { body, method = "GET", signal, key, ...rest } = {},
) {
  const binary = body instanceof Blob;
  const response = await fetch(`${apiBase}${path}`, {
    method,
    signal: signal || AbortSignal.timeout(20000),
    headers: {
      "Content-Type": binary ? body.type : "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(body ? { body: binary ? body : JSON.stringify(body) } : {}),
    ...rest,
  });
  const result = await response.json().catch(() => ({
    error: { message: "The server returned an invalid response" },
  }));
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(result.error?.message || "Request failed");
  }
  return result;
}
