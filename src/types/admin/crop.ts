import type { PaginatedResponse } from "@/types/api";

export interface CropTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface CropPayload {
  image?: null;
  category_id: number;
  slug: string;
  scientific_name: string | null;
  crop_code: string | null;
  is_active: boolean;
  ai_diagnosis_enabled?: boolean;
  translations: Record<string, { name: string; description: string | null }>;
}

export interface Crop {
  id: number;
  category_id: number;
  category_name: string | null;
  slug: string;
  scientific_name: string | null;
  crop_code: string | null;
  image_url: string | null;
  name: string | null;
  is_active: boolean;
  ai_diagnosis_enabled: boolean;
  translations?: Record<string, CropTranslation>;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}

export interface CropFormValues {
  image: File[];
  category_id: string;
  slug: string;
  scientific_name: string;
  crop_code: string;
  is_active: boolean;
  ai_diagnosis_enabled: boolean;
  translations: Record<string, { name: string; description: string }>;
}

export interface CropsFilterValues {
  keyword: string;
  category_id: string;
  status: "" | "1" | "0";
}

export type CropsListResponse = PaginatedResponse<Crop>;
