import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { PaginatedResponse } from "@/types/api";
import type { FarmRegion, FarmRegionType } from "@/types/account/region";

export const accountRegionsAPI = {
  list: (regionType: FarmRegionType, parentId?: number, page = 1) =>
    apiRequest<PaginatedResponse<FarmRegion>>("/regions", {
      audience: "public",
      params: {
        region_type: regionType,
        parent_id: parentId,
        is_active: 1,
        per_page: 100,
        page,
      },
    }),
};
