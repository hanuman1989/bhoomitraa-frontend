import type { PaginatedResponse } from "@/types/api";
import type { SeedListItem } from "@/types/admin/seed";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import type {
  RegionScope,
  StageTimeline,
} from "@/types/admin/cropStageTimeline";

export const seedPriceTypes = [
  "mrp",
  "retail",
  "wholesale",
  "indicative",
] as const;
export type SeedPriceType = (typeof seedPriceTypes)[number];
export type SeedPriceProduct = Pick<
  SeedListItem,
  | "id"
  | "name"
  | "sku"
  | "material_type"
  | "crop_id"
  | "crop_name"
  | "crop_variety_id"
  | "crop_variety_name"
  | "primary_image"
> &
  Partial<
    Pick<
      SeedListItem,
      | "default_unit_code"
      | "reference_pack_quantity"
      | "reference_pack_unit_code"
    >
  >;
export interface SeedPriceListItem {
  id: number;
  seed_id: number;
  seller_name: string | null;
  price_type: SeedPriceType;
  package_quantity: string;
  package_unit_code: SeedListItem["default_unit_code"];
  currency_code: string;
  package_price: string;
  region_scope: RegionScope;
  source_id: number | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  last_verified_at: string | null;
  seed: SeedPriceProduct | null;
  source_title: string | null;
  knowledge_source: Pick<
    KnowledgeSource,
    | "id"
    | "title"
    | "publisher"
    | "source_type"
    | "source_url"
    | "reference_identifier"
  > | null;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}
export interface SeedPrice extends SeedPriceListItem {
  region_ids: number[];
  regions: (StageTimeline["regions"][number] & { is_active: boolean })[];
}
export type SeedPricePayload = Pick<
  SeedPrice,
  | "seed_id"
  | "seller_name"
  | "price_type"
  | "package_quantity"
  | "package_unit_code"
  | "package_price"
  | "currency_code"
  | "region_scope"
  | "source_id"
  | "effective_from"
  | "effective_to"
  | "is_active"
  | "region_ids"
>;
export type SeedPriceFormValues = Omit<
  SeedPricePayload,
  | "seed_id"
  | "source_id"
  | "seller_name"
  | "effective_to"
  | "price_type"
  | "package_unit_code"
> & {
  seed_id: string;
  source_id: string;
  seller_name: string;
  effective_to: string;
  price_type: SeedPriceType | "";
  package_unit_code: SeedPricePayload["package_unit_code"] | "";
};
export interface SeedPriceFilters {
  keyword: string;
  seed_id: string;
  price_type: SeedPriceType | "";
  region_scope: RegionScope | "";
  is_active: "" | "0" | "1";
}
export type SeedPricesResponse = PaginatedResponse<SeedPriceListItem>;
