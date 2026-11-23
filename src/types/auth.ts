import type { ApiResponse } from "@/types/api";
import type { AdminUser } from "@/types/admin/adminUser";

// Login request payload
export interface AdminLoginPayload {
  email: string;
  password: string;
  isChecked: boolean;
}

// Body sent to Laravel POST /admin/login
export interface AdminLoginRequest {
  email: string;
  password: string;
  /** true -> 30-day token, false -> 24-hour token (Laravel config). */
  remember: boolean;
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
