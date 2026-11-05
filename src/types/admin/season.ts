import type { PaginatedResponse } from "@/types/api";

// Required by Laravel; additional languages come from the shared language catalog.
export const requiredSeasonLocales = ["en", "hi"] as const;

export interface SeasonTranslation {
  locale: string;
  name: string;
  description: string | null;
}

// The index resource deliberately excludes translations.
export interface SeasonListItem {
  id: number;
  slug: string;
  name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}

export interface Season extends SeasonListItem {
  translations: Record<string, SeasonTranslation>;
}

export interface SeasonPayload {
  slug: string;
  translations: Record<string, { name: string; description: string | null }>;
}

export interface SeasonFormValues {
  slug: string;
  is_active: boolean;
  translations: Record<string, { name: string; description: string }>;
}

export interface SeasonsFilterValues {
  keyword: string;
  status: "" | "1" | "0";
}

export type SeasonsListResponse = PaginatedResponse<SeasonListItem>;
