import type { PageSearchParams } from "@/types/api";
import type { CropFilters, CropStatus } from "@/types/account/farmCrop";
export function cropFilters(params: PageSearchParams): CropFilters {
  const value = (key: string) =>
    typeof params[key] === "string" ? params[key] : "";
  const positive = (key: string) =>
    /^\d+$/.test(value(key)) &&
    Number.isSafeInteger(Number(value(key))) &&
    Number(value(key)) > 0
      ? Number(value(key))
      : undefined;
  const tab = value("tab");
  const historyStatus = value("history_status");
  const status: CropStatus =
    tab === "drafts"
      ? "draft"
      : tab === "history"
        ? historyStatus === "cancelled"
          ? "cancelled"
          : "completed"
        : "active";
  return {
    status,
    search: value("search").slice(0, 150),
    farm_id: positive("farm_id"),
    season_id: positive("season_id"),
    page: positive("page") ?? 1,
    per_page: 15,
  };
}
