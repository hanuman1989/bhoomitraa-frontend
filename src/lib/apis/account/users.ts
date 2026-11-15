import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Region } from "@/types/admin/region";
import type { AreaUnitsConfig } from "@/types/account/areaUnit";
import type {
  FarmerUser,
  UserRegisterPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  PersonalDetailsPayload,
  LocationDetailsPayload,
} from "@/lib/userAuth/types";

export const accountUsersAPI = {
  areaUnits: () =>
    apiRequest<ApiResponse<AreaUnitsConfig>>("/account/area-units", {
      audience: "web",
    }),
  updatePersonalDetails: (data: PersonalDetailsPayload) =>
    apiRequest<ApiResponse<FarmerUser>>("/account/profile/personal", {
      method: "PATCH",
      audience: "web",
      data,
    }),
  updateLocationDetails: (data: LocationDetailsPayload) =>
    apiRequest<ApiResponse<FarmerUser>>("/account/profile/location", {
      method: "PATCH",
      audience: "web",
      data,
    }),
  profileRegions: (stateId?: number, page = 1, regionType?: "subdistrict") =>
    apiRequest<PaginatedResponse<Region>>("/regions", {
      audience: "public",
      params: {
        region_type:
          regionType ?? (stateId === undefined ? "state" : "district"),
        parent_id: stateId,
        is_active: 1,
        per_page: 100,
        page,
      },
    }),
  register: (data: UserRegisterPayload) =>
    apiRequest<ApiResponse<FarmerUser>>("/account/register", {
      method: "POST",
      audience: "public",
      data,
    }),
  forgotPassword: (data: ForgotPasswordPayload) =>
    apiRequest<ApiResponse<null>>("/account/forgot-password", {
      method: "POST",
      audience: "public",
      data,
    }),
  resetPassword: (data: ResetPasswordPayload) =>
    apiRequest<ApiResponse<null>>("/account/reset-password", {
      method: "POST",
      audience: "public",
      data,
    }),
};
