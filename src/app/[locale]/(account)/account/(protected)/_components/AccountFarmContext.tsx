"use client";
import { createContext, useContext } from "react";
import type { Farm, FarmSummary } from "@/types/account/farm";
import type { FarmSatelliteSources } from "@/components/common/maps/farmStaticMap";
import type {
  CropCycle,
  CropMapRecord,
  CropStatus,
} from "@/types/account/farmCrop";
import type {
  IrrigationAssetType,
  IrrigationGeometry,
  IrrigationMapFeature,
} from "@/types/account/irrigation";
import type {
  IrrigationEditorRequest,
  IrrigationMapModel,
} from "../irrigation/_components/irrigationMap";
export interface AccountFarmWorkspace {
  farms: Farm[];
  summary: FarmSummary | null;
  summaryStatus: "loading" | "ready" | "error";
  refreshSummary: () => void;
  satellitePreviews?: FarmSatelliteSources;
  status: "loading" | "ready" | "error";
  selectedFarmId: number | null;
  selectFarm: (id: number) => void;
  openFarm: (farm?: Farm) => void;
  refresh: () => void;
  revision: number;
  crops: {
    records: CropMapRecord[];
    selectedId: number | null;
    status: "loading" | "ready" | "error";
    revision: number;
    refresh: () => void;
    select: (crop: CropCycle | CropMapRecord) => void;
    open: (options?: {
      id?: number;
      farmId?: number;
      startStep?: number;
    }) => void;
    details: (id: number, section?: "soil" | "fertilizer") => void;
    /** Opens the Crop Timeline dialog; `generate` prepares the timeline first. */
    timeline: (id: number, options?: { generate?: boolean }) => void;
    remove: (crop: { id: number; name: string; status: CropStatus }) => void;
  };
  /** Irrigation assets on the dashboard map. Assets are independent of farms. */
  irrigation: {
    /** Every mapped asset, unfiltered: what the map shows outside the Irrigation Manager. */
    assets: readonly IrrigationMapFeature[];
    /** Reloads `assets` after an asset is added, changed or deleted. */
    refresh: () => void;
    /** An asset tapped on another page's map, for the Irrigation Manager to open. */
    requestedId: string | null;
    clearRequest: () => void;
    /** The Irrigation Manager publishes what the map shows; null removes it. */
    publish: (model: IrrigationMapModel | null) => void;
    /** Locations can be picked and shown only when Google Maps is ready. */
    mapStatus: "loading" | "ready" | "error";
    editing: boolean;
    /** Starts a location edit on the map; false when it can't start now. */
    editLocation: (request: IrrigationEditorRequest) => boolean;
    /** Frames one asset on the map, showing its layer if it was hidden. */
    locate: (
      assetType: IrrigationAssetType,
      geometry: IrrigationGeometry,
    ) => void;
  };
}
export const AccountFarmContext = createContext<AccountFarmWorkspace | null>(
  null,
);
export function useAccountFarms() {
  const context = useContext(AccountFarmContext);
  if (!context)
    throw new Error("Farm workspace requires AccountDashboardShell");
  return context;
}
