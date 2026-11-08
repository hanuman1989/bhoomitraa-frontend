import type { ApiValidationErrors, PaginatedResponse } from "@/types/api";
import type {
  KnowledgeSource,
  VerificationStatus,
} from "@/types/admin/knowledgeSource";

export const materialTypes = [
  "seed",
  "seedling",
  "grafted_plant",
  "rooted_cutting",
  "tissue_culture_plant",
  "tuber",
  "bulb",
  "clove",
  "rhizome",
  "sett",
  "sucker",
  "runner",
  "corm",
  "vine_cutting",
  "other",
] as const;
export const seedTypes = [
  "improved",
  "hybrid",
  "open_pollinated",
  "local",
  "other",
] as const;
export const propagationMethods = [
  "seed",
  "cutting",
  "grafting",
  "budding",
  "tissue_culture",
  "division",
  "vegetative",
  "other",
] as const;
export const seedClasses = [
  "breeder",
  "foundation",
  "certified",
  "truthfully_labelled",
  "other",
] as const;
export const treatmentStatuses = ["treated", "untreated", "unknown"] as const;
export const seedUnitCodes = ["g", "kg", "piece", "plant"] as const;
export const seedVerificationStatuses = [
  "pending",
  "verified",
  "rejected",
  "outdated",
] as const;
export type MaterialType = (typeof materialTypes)[number];
export type SeedStep = 1 | 2 | 3 | 4;
export interface SeedImage {
  id: number;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
}
export interface SeedTranslation {
  name: string;
  description: string | null;
  planting_instructions: string | null;
}
export interface SeedListItem {
  id: number;
  seed_id: number;
  crop_id: number;
  crop_variety_id: number | null;
  name: string | null;
  crop_name: string | null;
  crop_variety_name: string | null;
  slug: string;
  sku: string | null;
  brand_name: string | null;
  producer_name: string | null;
  material_type: MaterialType;
  seed_type: (typeof seedTypes)[number] | null;
  propagation_method: (typeof propagationMethods)[number] | null;
  seed_class: (typeof seedClasses)[number] | null;
  treatment_status: (typeof treatmentStatuses)[number];
  default_unit_code: (typeof seedUnitCodes)[number];
  reference_pack_quantity: string | null;
  reference_pack_unit_code: (typeof seedUnitCodes)[number] | null;
  seeds_per_gram: string | null;
  germination_reference_pct: string | null;
  purity_reference_pct: string | null;
  is_f1_hybrid: boolean | null;
  is_organic: boolean | null;
  is_pelleted: boolean | null;
  source_id: number | null;
  source: Pick<
    KnowledgeSource,
    | "id"
    | "title"
    | "publisher"
    | "source_type"
    | "source_url"
    | "reference_identifier"
  > | null;
  verification_status: VerificationStatus;
  is_active: boolean;
  requested_is_active: boolean;
  setup_status: "draft" | "completed";
  completed_step: SeedStep;
  next_step: SeedStep | null;
  primary_image: SeedImage | null;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}
export interface Seed extends SeedListItem {
  description: string | null;
  planting_instructions: string | null;
  translations: Record<string, SeedTranslation>;
  images: SeedImage[];
  ready_to_finalize?: boolean;
  readiness_errors?: ApiValidationErrors;
}
export type SeedBasicPayload = Pick<
  SeedListItem,
  | "crop_id"
  | "crop_variety_id"
  | "slug"
  | "sku"
  | "brand_name"
  | "producer_name"
  | "material_type"
  | "seed_type"
  | "propagation_method"
  | "seed_class"
  | "treatment_status"
  | "default_unit_code"
  | "reference_pack_quantity"
  | "reference_pack_unit_code"
  | "seeds_per_gram"
  | "germination_reference_pct"
  | "purity_reference_pct"
  | "is_f1_hybrid"
  | "is_organic"
  | "is_pelleted"
> & { name: string };
export type SeedBasicValues = {
  [K in keyof SeedBasicPayload]: K extends
    "is_f1_hybrid" | "is_organic" | "is_pelleted"
    ? boolean | null
    : string;
};
export interface SeedTranslationValues {
  translations: Record<
    string,
    { name: string; description: string; planting_instructions: string }
  >;
}
export interface SeedMediaPayload {
  source_id: number | null;
  verification_status: VerificationStatus;
  is_active: boolean;
  retain_image_ids: number[];
  remove_image_ids: number[];
  image_order: string[];
}
export type SeedGalleryItem =
  | { token: string; image: SeedImage }
  | { token: string; file: File; preview: string };
export interface SeedMediaValues {
  source_id: string;
  verification_status: VerificationStatus;
  is_active: boolean;
  gallery: SeedGalleryItem[];
}
export interface SeedFilters {
  keyword: string;
  crop_id: string;
  crop_variety_id: string;
  material_type: MaterialType | "";
  is_active: "" | "0" | "1";
  verification_status: VerificationStatus | "";
  setup_status: "" | "draft" | "completed";
}
export type SeedsResponse = PaginatedResponse<SeedListItem>;
