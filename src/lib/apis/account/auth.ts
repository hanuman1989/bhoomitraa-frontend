import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiResponse } from "@/types/api";
import type {
  FarmerUser,
  UserLoginPayload,
  UserLoginResponse,
} from "@/lib/userAuth/types";

export const accountAuthAPI = {
  login: (data: UserLoginPayload) =>
    apiRequest<UserLoginResponse>("/account/login", {
      method: "POST",
      audience: "public",
      data,
    }),
  me: () =>
    apiRequest<ApiResponse<FarmerUser>>("/account/me", { audience: "web" }),
  logout: () =>
    apiRequest<ApiResponse<null>>("/account/logout", {
      method: "POST",
      audience: "web",
    }),
};
