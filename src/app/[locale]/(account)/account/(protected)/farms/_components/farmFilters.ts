import type { FarmFilters } from "@/types/account/farm";
export function farmFilters(
  search?: string | null,
  status?: string | null,
  page?: string | null,
): Required<Pick<FarmFilters, "search" | "status" | "page" | "per_page">> {
  const number = Number(page);
  return {
    search: search?.slice(0, 150).trim() ?? "",
    status:
      status === "active" || status === "inactive" ? status : ("all" as const),
    page: Number.isSafeInteger(number) && number > 0 ? number : 1,
    per_page: 15,
  };
}
