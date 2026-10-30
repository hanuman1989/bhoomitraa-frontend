import type { PaginatedResponse } from "@/types/api";

/** Matches an individual record in the supplied Admin Users listing JSON. */
export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  mobile: string | null;
  email: string;
  email_verified_at: string | null;
  status: boolean;
  is_super_user: boolean;
  created_at: string;
  updated_at: string;
}

/** Input fields for create/edit; not the API's response record. */
export interface AdminUserFormValues {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  password?: string;
  status: boolean;
}

export interface AdminUserFilters {
  keyword?: string;
  status?: boolean;
  page?: number;
}

export type ChangeAdminPasswordValues = {
  password: string;
  password_confirmation: string;
};

export type AdminUsersListResponse = PaginatedResponse<AdminUser>;
