import type { PaginatedResponse } from "@/types/api";

export const requiredActivityCategoryLocales = ["en", "hi"] as const;

export interface ActivityCategoryTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface ActivityCategoryListItem {
  id: number;
  slug: string;
  icon: string | null;
  name: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}

export interface ActivityCategory extends ActivityCategoryListItem {
  translations: Record<string, ActivityCategoryTranslation>;
}

export interface ActivityCategoryPayload {
  slug: string;
  icon: string | null;
  is_system: boolean;
  translations: Record<string, { name: string; description: string | null }>;
}

export interface ActivityCategoryFormValues {
  slug: string;
  icon: string;
  is_system: boolean;
  translations: Record<string, { name: string; description: string }>;
}

export interface ActivityCategoriesFilterValues {
  keyword: string;
  status: "" | "1" | "0";
  is_system: "" | "1" | "0";
}

export type ActivityCategoriesListResponse =
  PaginatedResponse<ActivityCategoryListItem>;
