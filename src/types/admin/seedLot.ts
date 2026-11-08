import type { PaginatedResponse } from "@/types/api";
import type { VerificationStatus } from "@/types/admin/knowledgeSource";
import type { SeedListItem } from "@/types/admin/seed";

export const lotValidityStatuses = [
  "all",
  "valid",
  "expiring_soon",
  "expired",
  "no_expiry",
] as const;
export type LotValidityStatus = (typeof lotValidityStatuses)[number];
export type LotSeedProduct = Pick<
  SeedListItem,
  | "id"
  | "name"
  | "sku"
  | "material_type"
  | "is_active"
  | "setup_status"
  | "crop_id"
  | "crop_name"
  | "crop_variety_id"
  | "crop_variety_name"
  | "primary_image"
>;
export interface SeedLot {
  id: number;
  seed_id: number;
  lot_number: string;
  seed_class: SeedListItem["seed_class"];
  seed_treatment_status: SeedListItem["treatment_status"] | null;
  production_date: string | null;
  test_date: string | null;
  valid_until: string | null;
  germination_percentage: string | null;
  physical_purity_percentage: string | null;
  genetic_purity_percentage: string | null;
  certification_number: string | null;
  certification_body: string | null;
  notes: string | null;
  is_active: boolean;
  verification_status: VerificationStatus;
  verified_by: number | null;
  verified_at: string | null;
  verifier: { id: number; first_name: string; last_name: string } | null;
  computed_validity_status: Exclude<LotValidityStatus, "all">;
  report_url: string | null;
  seed: LotSeedProduct | null;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}
export type SeedLotPayload = Pick<
  SeedLot,
  | "seed_id"
  | "lot_number"
  | "seed_class"
  | "seed_treatment_status"
  | "production_date"
  | "test_date"
  | "valid_until"
  | "germination_percentage"
  | "physical_purity_percentage"
  | "genetic_purity_percentage"
  | "certification_number"
  | "certification_body"
  | "notes"
  | "is_active"
> & {
  verification_status?: VerificationStatus;
  report_file?: null;
};
export type SeedLotFormValues = {
  [
    K in Exclude<keyof SeedLotPayload, "verification_status" | "report_file">
  ]: K extends "is_active" ? boolean : string;
} & { verification_status: VerificationStatus; report: File[] };
export interface SeedLotFilters {
  keyword: string;
  seed_id: string;
  verification_status: VerificationStatus | "";
  is_active: "" | "0" | "1";
  validity_status: LotValidityStatus;
}
export type SeedLotsResponse = PaginatedResponse<SeedLot>;
