import "server-only";
import { cropCategoriesAPI } from "@/lib/apis/admin/cropCategories";
import { ApiError } from "@/lib/api/ApiError";
import type { CropCategory } from "@/types/admin/cropCategory";

// Load every options page; never silently drop categories after the first 100.
export default async function loadCropCategories(
  activeOnly: boolean,
): Promise<CropCategory[]> {
  const categories: CropCategory[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await cropCategoriesAPI.list({
      page,
      per_page: 100,
      is_active: activeOnly ? "1" : undefined,
    });
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError("Unable to load crop categories", 502);
    categories.push(...response.data);
    lastPage = response.pagination.last_page;
    page++;
  } while (page <= lastPage);
  return categories;
}
