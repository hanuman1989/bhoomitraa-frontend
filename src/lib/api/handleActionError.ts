import "server-only";

import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/ApiError";
import type { ActionResult } from "@/types/api";

/**
 * Convert a Server Action's caught error into a serialisable failure result.
 * Pass a translated fallback for the operation; internal error messages and
 * backend 5xx details are never returned to the client.
 */
export async function handleActionError<T = undefined>(
  error: unknown,
  fallbackMessage?: string,
): Promise<ActionResult<T>> {
  // Authentication guards may redirect; let Next.js handle its own exceptions.
  unstable_rethrow(error);

  const t = await getTranslations("serverActions.errors");
  const fallback = fallbackMessage || t("unexpected");

  if (!(error instanceof ApiError)) {
    return { success: false, message: fallback };
  }

  let message: string;
  switch (error.status) {
    case 401:
    case 419:
      message = t("unauthenticated");
      break;
    case 403:
      message = t("forbidden");
      break;
    case 404:
      message = t("notFound");
      break;
    case 408:
    case 504:
      message = t("timeout");
      break;
    case 422:
      message = error.message.trim() || t("validation");
      break;
    case 429:
      message = t("tooManyRequests");
      break;
    case 503:
      message = t("unavailable");
      break;
    default:
      message =
        error.status >= 400 && error.status < 500
          ? error.message.trim() || fallback
          : fallback;
  }

  return {
    success: false,
    message,
    ...(error.status >= 400 &&
      error.status < 500 &&
      Object.keys(error.errors).length > 0 && { errors: error.errors }),
  };
}
