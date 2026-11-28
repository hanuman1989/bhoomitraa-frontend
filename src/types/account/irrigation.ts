import type { PaginatedResponse } from "@/types/api";

/**
 * Irrigation Manager contracts (`/api/account/irrigation-assets`). Laravel owns
 * the option keys, validation and display labels; ids and decimals are strings.
 */
export type IrrigationAssetType = "source" | "pipeline";
export type IrrigationSourceType =
  | "borewell"
  | "open_well"
  | "canal"
  | "pond"
  | "tank"
  | "river"
  | "reservoir"
  | "rainwater_collection"
  | "other";
export type IrrigationPipelineType =
  "underground" | "surface" | "portable" | "other";
export type IrrigationStatus =
  "operational" | "needs_maintenance" | "out_of_service" | "inactive";
export type IrrigationOwnershipType =
  "owned" | "shared" | "rented" | "public" | "other";
export type IrrigationWaterAvailability =
  "good" | "moderate" | "low" | "seasonal" | "no_water" | "unknown";
/** `calculated` comes from the drawn route, `manual` was entered without one. */
export type IrrigationLengthSource = "calculated" | "manual";

/** GeoJSON position: longitude first, then latitude. */
export type Coordinates = [lng: number, lat: number];
export interface PointGeometry {
  type: "Point";
  coordinates: Coordinates;
}
export interface LineStringGeometry {
  type: "LineString";
  coordinates: Coordinates[];
}
export type IrrigationGeometry = PointGeometry | LineStringGeometry;

interface IrrigationAssetBase {
  id: string;
  name: string;
  ownership_type: IrrigationOwnershipType | null;
  status: IrrigationStatus;
  notes: string | null;
  type_label: string | null;
  status_label: string;
  ownership_label: string | null;
  created_at: string;
  updated_at: string;
}
export interface WaterSourceAsset extends IrrigationAssetBase {
  asset_type: "source";
  source_type: IrrigationSourceType;
  pipeline_type: null;
  geometry: PointGeometry | null;
  length_meters: null;
  diameter_mm: null;
  /** Reported physical depth; only borewell, open well, pond and reservoir. */
  depth_meters: string | null;
  water_availability: IrrigationWaterAvailability | null;
  water_availability_label: string | null;
  length_source: null;
}
export interface PipelineAsset extends IrrigationAssetBase {
  asset_type: "pipeline";
  source_type: null;
  pipeline_type: IrrigationPipelineType;
  geometry: LineStringGeometry | null;
  length_meters: string | null;
  diameter_mm: string | null;
  depth_meters: null;
  water_availability: null;
  water_availability_label: null;
  length_source: IrrigationLengthSource | null;
}
export type IrrigationAsset = WaterSourceAsset | PipelineAsset;
export type IrrigationListResponse = PaginatedResponse<IrrigationAsset>;

/** Unfiltered totals over every non-deleted asset, inactive ones included. */
export interface IrrigationSummary {
  total_assets: number;
  water_sources: number;
  /** Water sources that need maintenance or are out of service. */
  water_sources_needing_attention: number;
  pipelines: number;
  pipelines_with_route: number;
  /** Known lengths only: null when no pipeline has one, "0.00" without pipelines. */
  total_pipeline_length_meters: string | null;
  pipelines_with_known_length: number;
  pipelines_with_unknown_length: number;
  mapped_assets: number;
  unmapped_assets: number;
}

export interface IrrigationOption<K extends string> {
  key: K;
  label: string;
}
export interface IrrigationOptions {
  asset_types: IrrigationOption<IrrigationAssetType>[];
  source_types: (IrrigationOption<IrrigationSourceType> & {
    supports_depth: boolean;
  })[];
  pipeline_types: IrrigationOption<IrrigationPipelineType>[];
  statuses: IrrigationOption<IrrigationStatus>[];
  ownership_types: IrrigationOption<IrrigationOwnershipType>[];
  water_availability: IrrigationOption<IrrigationWaterAvailability>[];
}

/** One mapped asset with the minimal properties the map needs (no notes). */
export type IrrigationMapFeature =
  | {
      type: "Feature";
      id: string;
      geometry: PointGeometry;
      properties: {
        name: string;
        asset_type: "source";
        source_type: IrrigationSourceType;
        status: IrrigationStatus;
        type_label: string | null;
        status_label: string;
      };
    }
  | {
      type: "Feature";
      id: string;
      geometry: LineStringGeometry;
      properties: {
        name: string;
        asset_type: "pipeline";
        pipeline_type: IrrigationPipelineType;
        status: IrrigationStatus;
        type_label: string | null;
        status_label: string;
      };
    };
export interface IrrigationMapCollection {
  type: "FeatureCollection";
  features: IrrigationMapFeature[];
}

/** List and map query. The map ignores `page` and `per_page`. */
export interface IrrigationFilters {
  asset_type?: IrrigationAssetType;
  source_type?: IrrigationSourceType;
  pipeline_type?: IrrigationPipelineType;
  status?: IrrigationStatus;
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * Request bodies. The owner and response metadata are never sent: Laravel sets
 * the owner from the signed-in farmer and calculates the length of a drawn route.
 */
interface IrrigationAssetFields {
  name: string;
  ownership_type: IrrigationOwnershipType | null;
  status: IrrigationStatus;
  notes: string | null;
}
export interface WaterSourceFields extends IrrigationAssetFields {
  source_type: IrrigationSourceType;
  depth_meters: number | null;
  water_availability: IrrigationWaterAvailability | null;
  /** Omitted when unchanged; null removes the location. */
  geometry?: PointGeometry | null;
}
export interface PipelineFields extends IrrigationAssetFields {
  pipeline_type: IrrigationPipelineType;
  diameter_mm: number | null;
  /** Only without a route: the server calculates a mapped pipeline's length. */
  length_meters?: number | null;
  /** Omitted when unchanged; null removes the route. */
  geometry?: LineStringGeometry | null;
}
export type CreateIrrigationAssetInput =
  | ({ asset_type: "source" } & WaterSourceFields)
  | ({ asset_type: "pipeline" } & PipelineFields);
/** PATCH: omitted fields keep their values. The category can't change. */
export type UpdateIrrigationAssetInput =
  Partial<WaterSourceFields> | Partial<PipelineFields>;
