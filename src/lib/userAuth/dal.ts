import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/ApiError";
import { accountAuthAPI } from "@/lib/apis/account/auth";
import { readUserToken } from "./session";
import type { FarmerUser } from "./types";

export const getCurrentUser = cache(async (): Promise<FarmerUser | null> => {
  if (!(await readUserToken())) return null;
  try {
    const response = await accountAuthAPI.me();
    if (!response.status || !response.data?.id)
      throw new ApiError("Invalid account response", 502);
    return response.data.status ? response.data : null;
  } catch (error: unknown) {
    if (error instanceof ApiError && [401, 403, 419].includes(error.status))
      return null;
    throw error;
  }
});
export async function requireUser(): Promise<FarmerUser> {
  const user = await getCurrentUser();
  if (!user)
    return redirect({ href: "/account/login", locale: await getLocale() });
  return user;
}
