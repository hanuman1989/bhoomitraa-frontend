"use client";
import { createContext, useContext } from "react";
import type { Farm, FarmSummary } from "@/types/account/farm";
import type { FarmSatelliteSources } from "@/components/common/maps/farmStaticMap";
import type {
  CropCycle,
  CropMapRecord,
  CropStatus,
} from "@/types/account/farmCrop";
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
    remove: (crop: { id: number; name: string; status: CropStatus }) => void;
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
