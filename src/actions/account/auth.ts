"use server";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import { accountAuthAPI } from "@/lib/apis/account/auth";
import {
  clearUserToken,
  readUserToken,
  setUserToken,
} from "@/lib/userAuth/session";
import { getCurrentUser } from "@/lib/userAuth/dal";
import type { ActionResult } from "@/types/api";
import type { FarmerUser, UserLoginPayload } from "@/lib/userAuth/types";

export async function loginUser(
  values: UserLoginPayload,
): Promise<ActionResult<FarmerUser>> {
  const t = await getTranslations("account.feedback");
  try {
    const response = await accountAuthAPI.login({
      login: values.login,
      password: values.password,
      remember: values.remember === true,
    });
    if (
      !response.status ||
      !response.data?.user?.id ||
      !response.data.user.status ||
      typeof response.data.access_token !== "string" ||
      !response.data.access_token ||
      typeof response.data.expires_at !== "string"
    )
      return { success: false, message: t("invalidSession") };
    await setUserToken(response.data.access_token, response.data.expires_at);
    return { success: true, message: t("loggedIn"), data: response.data.user };
  } catch (error: unknown) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      return { success: false, message: t("credentials") };
    return handleActionError<FarmerUser>(error, t("loginFailed"));
  }
}
export async function getAuthenticatedUser(): Promise<
  ActionResult<FarmerUser | null>
> {
  const t = await getTranslations("account.feedback");
  try {
    const user = await getCurrentUser();
    if (!user) await clearUserToken();
    return { success: true, message: "", data: user };
  } catch (error: unknown) {
    return handleActionError<FarmerUser | null>(error, t("sessionFailed"));
  }
}
export async function logoutUser(): Promise<ActionResult> {
  const t = await getTranslations("account.feedback");
  try {
    if (await readUserToken()) {
      const response = await accountAuthAPI.logout();
      if (!response.status)
        return { success: false, message: t("logoutFailed") };
    }
    return { success: true, message: t("loggedOut") };
  } catch (error: unknown) {
    if (error instanceof ApiError && [401, 403, 419].includes(error.status))
      return { success: true, message: t("loggedOut") };
    return handleActionError(error, t("logoutFailed"));
  } finally {
    await clearUserToken();
  }
}
