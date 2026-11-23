import type { ApiResponse } from "@/types/api";

export interface FarmerProfile {
  id: number;
  profile_image: string | null;
  state_id: number | null;
  district_id: number | null;
  state?: { id: number; name: string | null } | null;
  district?: { id: number; name: string | null } | null;
  village: string | null;
  address: string | null;
  pincode: string | null;
  preferred_language: "en" | "hi";
  preferred_units: string | null;
}

export interface FarmerUser {
  id: number;
  first_name: string;
  last_name: string;
  mobile: string;
  email: string | null;
  email_verified_at: string | null;
  status: boolean;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  farmer_profile?: FarmerProfile | null;
}
export interface PersonalDetailsPayload {
  first_name: string;
  last_name: string;
  preferred_language: FarmerProfile["preferred_language"];
  preferred_units: string;
}
export interface LocationDetailsPayload {
  state_id: number;
  district_id: number;
  village: string;
  address: string | null;
  pincode: string | null;
}
export interface UserLoginPayload {
  login: string;
  password: string;
  /** true -> 30-day token, false -> 24-hour token (Laravel config). */
  remember: boolean;
}
export interface UserLoginData {
  user: FarmerUser;
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
}
export type UserLoginResponse = ApiResponse<UserLoginData>;
export interface UserRegisterPayload {
  first_name: string;
  last_name: string;
  mobile: string;
  email: string | null;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
}
export interface UserRegisterValues extends Omit<UserRegisterPayload, "email"> {
  email: string;
}
export interface ForgotPasswordPayload {
  email: string;
}
export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}
