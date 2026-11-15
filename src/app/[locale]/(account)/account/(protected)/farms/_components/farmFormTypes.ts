import type { AreaUnit, OwnershipType } from "@/types/account/farm";
export interface FarmFormValues {
  name: string;
  description: string;
  ownership_type: OwnershipType | "";
  area: string;
  area_unit: AreaUnit | "";
  state_id: string;
  district_id: string;
  tehsil_id: string;
  village: string;
  address: string;
}
export const informationFields = [
  "name",
  "description",
  "ownership_type",
  "area",
  "area_unit",
] as const;
export const locationFields = [
  "state_id",
  "district_id",
  "tehsil_id",
  "village",
  "address",
] as const;
export const farmButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-success-600 px-6 py-2.5 text-sm font-semibold text-success-700 transition hover:bg-success-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-success-300 dark:hover:bg-success-950";
export const farmPrimaryButton = `${farmButton} bg-success-700 text-white shadow-theme-xs hover:bg-success-800 dark:text-white dark:hover:bg-success-800`;
export const farmControl =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-theme-xs outline-none focus:border-success-500 focus:ring-3 focus:ring-success-500/15 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white";
