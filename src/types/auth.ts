import type { ApiResponse } from "@/types/api";
import type { AdminUser } from "@/types/admin/adminUser";

// Login request payload
export interface AdminLoginPayload {
  email: string;
  password: string;
  isChecked: boolean;
}

// Login response data
export interface AdminLoginData {
  admin_user: AdminUser;
  access_token: string;
  token_type: "Bearer";
  expires_at: string | null;
}

// Complete Laravel login API response
export type AdminLoginResponse = ApiResponse<AdminLoginData>;

// Login Server Action result
export interface AdminLoginActionResult {
  success: boolean;
  message: string;
  errors?: Partial<Record<keyof AdminLoginPayload, string[]>>;
}
