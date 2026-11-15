"use server";
import { getTranslations } from "next-intl/server";
import { handleActionError } from "@/lib/api/handleActionError";
import { accountUsersAPI } from "@/lib/apis/account/users";
import { clearUserToken } from "@/lib/userAuth/session";
import { requireUser } from "@/lib/userAuth/dal";
import type { ActionResult } from "@/types/api";
import type { Region } from "@/types/admin/region";
import type { AreaUnitsConfig } from "@/types/account/areaUnit";
import type {
  UserRegisterPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  FarmerUser,
  PersonalDetailsPayload,
  LocationDetailsPayload,
} from "@/lib/userAuth/types";

export async function getAreaUnits(): Promise<ActionResult<AreaUnitsConfig>> {
  const t = await getTranslations("areaUnits");
  try {
    await requireUser();
    const response = await accountUsersAPI.areaUnits();
    return response.status && response.data
      ? { success: true, message: "", data: response.data }
      : { success: false, message: t("loadFailed") };
  } catch (error: unknown) {
    return handleActionError<AreaUnitsConfig>(error, t("loadFailed"));
  }
}

export async function updatePersonalDetails(
  values: PersonalDetailsPayload,
): Promise<ActionResult<FarmerUser>> {
  const t = await getTranslations("farmerProfile.feedback");
  try {
    await requireUser();
    const response = await accountUsersAPI.updatePersonalDetails({
      first_name: values.first_name,
      last_name: values.last_name,
      preferred_language: values.preferred_language,
      preferred_units: values.preferred_units,
    });
    return response.status && response.data?.id
      ? { success: true, message: t("personalSaved"), data: response.data }
      : { success: false, message: t("saveFailed") };
  } catch (error: unknown) {
    return handleActionError<FarmerUser>(error, t("saveFailed"));
  }
}

export async function updateLocationDetails(
  values: LocationDetailsPayload,
): Promise<ActionResult<FarmerUser>> {
  const t = await getTranslations("farmerProfile.feedback");
  try {
    await requireUser();
    const response = await accountUsersAPI.updateLocationDetails({
      state_id: values.state_id,
      district_id: values.district_id,
      village: values.village,
      address: values.address,
      pincode: values.pincode,
    });
    return response.status && response.data?.id
      ? { success: true, message: t("saved"), data: response.data }
      : { success: false, message: t("saveFailed") };
  } catch (error: unknown) {
    return handleActionError<FarmerUser>(error, t("saveFailed"));
  }
}

export async function getProfileRegions(
  stateId?: number,
  regionType?: "subdistrict",
): Promise<ActionResult<Region[]>> {
  const t = await getTranslations("farmerProfile.feedback");
  try {
    await requireUser();
    const first = await accountUsersAPI.profileRegions(stateId, 1, regionType);
    if (!first.status) return { success: false, message: t("regionsFailed") };
    const regions = [...first.data];
    for (let page = 2; page <= first.pagination.last_page; page++) {
      const response = await accountUsersAPI.profileRegions(
        stateId,
        page,
        regionType,
      );
      if (!response.status)
        return { success: false, message: t("regionsFailed") };
      regions.push(...response.data);
    }
    return { success: true, message: "", data: regions };
  } catch (error: unknown) {
    return handleActionError<Region[]>(error, t("regionsFailed"));
  }
}

export async function registerUser(
  values: UserRegisterPayload,
): Promise<ActionResult> {
  const t = await getTranslations("account.feedback");
  try {
    const response = await accountUsersAPI.register({
      first_name: values.first_name,
      last_name: values.last_name,
      mobile: values.mobile,
      email: values.email,
      password: values.password,
      password_confirmation: values.password_confirmation,
      terms_accepted: values.terms_accepted,
    });
    return response.status && response.data?.id
      ? { success: true, message: t("registered") }
      : { success: false, message: t("registerFailed") };
  } catch (error: unknown) {
    return handleActionError(error, t("registerFailed"));
  }
}
export async function forgotUserPassword(
  values: ForgotPasswordPayload,
): Promise<ActionResult> {
  const t = await getTranslations("account.feedback");
  try {
    const response = await accountUsersAPI.forgotPassword({
      email: values.email,
    });
    return response.status
      ? { success: true, message: t("resetLinkSent") }
      : { success: false, message: t("recoveryFailed") };
  } catch (error: unknown) {
    return handleActionError(error, t("recoveryFailed"));
  }
}
export async function resetUserPassword(
  values: ResetPasswordPayload,
): Promise<ActionResult> {
  const t = await getTranslations("account.feedback");
  try {
    const response = await accountUsersAPI.resetPassword({
      token: values.token,
      email: values.email,
      password: values.password,
      password_confirmation: values.password_confirmation,
    });
    if (!response.status) return { success: false, message: t("resetFailed") };
    await clearUserToken();
    return { success: true, message: t("passwordReset") };
  } catch (error: unknown) {
    return handleActionError(error, t("resetFailed"));
  }
}
