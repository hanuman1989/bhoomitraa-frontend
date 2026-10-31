"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/ApiError";
import adminAuthAPI from "@/lib/apis/admin/adminAuth";
import {
  setAdminToken,
  readAdminToken,
  clearAdminToken,
} from "@/lib/auth/session";
import type { AdminLoginPayload, AdminLoginActionResult } from "@/types/auth";
import { getTranslations } from "next-intl/server";

/** Called by the React Hook Form submit handler. Never returns an access token. */
export async function loginAdmin(
  values: AdminLoginPayload,
): Promise<AdminLoginActionResult> {
  const tUi = await getTranslations("auth.messages");

  const email = typeof values?.email === "string" ? values.email.trim() : "";
  const password = typeof values?.password === "string" ? values.password : "";
  const isChecked = values?.isChecked === true;

  try {
    const response = await adminAuthAPI.login({ email, password, isChecked });
    const token = response?.data?.access_token;

    if (!response?.status || typeof token !== "string" || !token) {
      return {
        success: false,
        message: response?.message || tUi("invalidAuthenticationResponse"),
      };
    }

    // IMPORTANT: the session setter must cap cookie expiration to
    // response.data.expires_at (Laravel token expiration).
    await setAdminToken(token, isChecked);

    return {
      success: true,
      message: response.message || tUi("signedInSuccessfully"),
    };
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 422) {
        return {
          success: false,
          message: tUi("pleaseCheckYourLoginDetails"),
          errors: {
            email: error.errors.email,
            password: error.errors.password,
          },
        };
      }
      if (error.status === 401 || error.status === 403) {
        return { success: false, message: tUi("invalidEmailOrPassword") };
      }
      if (error.status === 429) {
        return {
          success: false,
          message: tUi("tooManyLoginAttemptsPleaseTryAgainLater"),
        };
      } else {
        return {
          success: false,
          message:
            error.status >= 500
              ? tUi("unableToSignInPleaseTryAgain")
              : error.message,
        };
      }
    }
    // Don't log credentials, API responses or Bearer tokens.
    return { success: false, message: tUi("unableToSignInPleaseTryAgain") };
  }
}

/** Revokes the current Laravel token and clears local browser credentials. */
export async function logoutAdmin(): Promise<never> {
  const token = await readAdminToken();

  if (token) {
    try {
      await adminAuthAPI.logout();
    } catch {
      // Clearing the cookie ends local access; Laravel revocation may have failed.
    }
  }

  await clearAdminToken();
  redirect(`/admin/login`);
}
