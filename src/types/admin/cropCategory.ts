import type { PaginatedResponse } from "@/types/api";

export interface CropCategoryTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface CropCategory {
  id: number;
  slug: string;
  name: string | null;
  is_active: boolean;
  // Laravel omits translations on the list and includes them on detail/mutations.
  translations?: Record<string, CropCategoryTranslation>;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}

export interface CropCategoryPayload {
  slug: string;
  translations: Record<string, { name: string; description: string | null }>;
}

export interface CropCategoryFormValues {
  slug: string;
  is_active: boolean;
  translations: Record<string, { name: string; description: string }>;
}

export interface CropCategoriesFilterValues {
  keyword: string;
  status: "" | "1" | "0";
}

export type CropCategoriesListResponse = PaginatedResponse<CropCategory>;
