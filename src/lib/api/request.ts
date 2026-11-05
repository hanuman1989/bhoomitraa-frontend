import "server-only";

import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { ApiError } from "./ApiError";
import type { ApiAudience, ApiRequestOptions } from "@/types/api";

const TOKEN_COOKIES: Record<Exclude<ApiAudience, "public">, string> = {
  admin: "admin_access_token",
  web: "web_access_token",
};

/**
 * Server-only HTTP client for all Laravel APIs.
 * T is the entire JSON response shape, e.g. ApiResponse<User>.
 * Never import this module into a Client Component.
 */
export function apiRequest(
  path: string,
  options: ApiRequestOptions & { responseType: "binary" },
): Promise<Blob>;
export function apiRequest<T = unknown>(
  path: string,
  options?: ApiRequestOptions & { responseType?: "json" },
): Promise<T>;
export async function apiRequest<T = unknown>(
  path: string,
  {
    method = "GET",
    data,
    params,
    audience = "admin",
    responseType = "json",
  }: ApiRequestOptions = {},
): Promise<T | Blob> {
  // Only allow relative backend API paths, never arbitrary URLs.
  if (!/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(path) || path.includes("..")) {
    throw new Error("Invalid API path");
  }

  if (audience !== "admin" && audience !== "web" && audience !== "public") {
    throw new Error("Invalid API audience");
  }

  if ((method === "GET" || method === "DELETE") && data !== undefined) {
    throw new Error(`${method} requests must not include a body`);
  }

  const base = process.env.API_BASE_URL;
  if (!base) throw new Error("Missing API_BASE_URL");

  const url = new URL(`${base.replace(/\/$/, "")}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const locale = await getLocale();
  const headers = new Headers({
    Accept: "application/json",
    "X-Locale": locale,
  });

  if (audience !== "public") {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIES[audience])?.value;
    if (!token) throw new ApiError("Please sign in again", 401);
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = data instanceof FormData;
  if (data !== undefined && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        data === undefined
          ? undefined
          : isFormData
            ? data
            : JSON.stringify(data),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new ApiError("Backend service unavailable", 503);
  }

  // Only successful binary responses bypass JSON parsing. Errors retain the
  // existing status, validation, and safe-message handling below.
  if (response.ok && responseType === "binary") return response.blob();

  let result: unknown = null;
  if (response.status !== 204) {
    try {
      result = await response.json();
    } catch {
      throw new ApiError("Unexpected API response", 502);
    }
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new ApiError("Backend request failed", response.status);
    }

    const errorBody = result as {
      message?: unknown;
      errors?: Record<string, string[] | string>;
    } | null;
    const t = await getTranslations("serverActions.errors");
    const message =
      typeof errorBody?.message === "string"
        ? errorBody.message
        : t("requestFailed");
    const errors = Object.fromEntries(
      Object.entries(errorBody?.errors ?? {}).map(([field, messages]) => [
        field,
        Array.isArray(messages) ? messages.map(String) : [String(messages)],
      ]),
    );
    throw new ApiError(message, response.status, errors);
  }

  // Generic T describes the expected API contract; validate untrusted data
  // at runtime in the calling service if the response shape is uncertain.
  return result as T;
}
