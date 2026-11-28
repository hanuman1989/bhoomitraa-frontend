import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import { cropFieldLayoutsAPI } from "@/lib/apis/admin/cropFieldLayouts";
import { getTimelineOption } from "@/lib/apis/admin/cropStageTimelines";
import { sowingMethodsAPI } from "@/lib/apis/admin/sowingMethods";
import { requireAdmin } from "@/lib/auth/dal";
import type {
  CropFieldLayoutFilters,
  CropFieldLayoutOptions,
  CropFieldLayoutsResponse,
} from "@/types/admin/cropFieldLayout";
import type { TimelineOption } from "@/types/admin/cropStageTimeline";
import type { PageProps } from "@/types/api";
import CropFieldLayoutFiltersForm from "./CropFieldLayoutFilters";
import CropFieldLayoutsList from "./CropFieldLayoutsList";

export default async function CropFieldLayoutsContent({
  searchParams,
}: PageProps) {
  const t = await getTranslations("cropFieldLayouts");
  const params = await searchParams;
  const value = (name: string) => {
    const entry = params[name];
    return Array.isArray(entry) ? (entry[0] ?? "") : (entry ?? "");
  };
  const id = (name: string) => {
    const raw = value(name);
    const parsed = Number(raw);
    return /^\d+$/.test(raw) && Number.isSafeInteger(parsed) && parsed > 0
      ? String(parsed)
      : "";
  };

  const filters: CropFieldLayoutFilters = {
    keyword: value("keyword").trim().slice(0, 150),
    crop_id: id("crop_id"),
    sowing_method_id: id("sowing_method_id"),
    layout_type: value("layout_type"),
    farming_type: value("farming_type"),
  };
  let options: CropFieldLayoutOptions | undefined;
  let result: CropFieldLayoutsResponse | undefined;
  let crop: TimelineOption | null = null;
  let method: TimelineOption | null = null;
  let failure = "";

  try {
    await requireAdmin();
    const response = await cropFieldLayoutsAPI.options();
    if (!response.status) throw new ApiError(t("loadFailed"), 502);
    options = response.data;

    if (
      !options.layout_types.some(({ value }) => value === filters.layout_type)
    ) {
      filters.layout_type = "";
    }
    if (
      !options.farming_types.some(({ value }) => value === filters.farming_type)
    ) {
      filters.farming_type = "";
    }

    const [listResult, cropResult, methodResult] = await Promise.allSettled([
      cropFieldLayoutsAPI.list({
        ...filters,
        page: Number(id("page")) || 1,
        per_page: 10,
      }),
      filters.crop_id
        ? getTimelineOption("crop", Number(filters.crop_id))
        : null,
      filters.sowing_method_id
        ? sowingMethodsAPI.show(Number(filters.sowing_method_id))
        : null,
    ]);
    if (cropResult.status === "fulfilled") crop = cropResult.value;
    if (methodResult.status === "fulfilled" && methodResult.value?.status) {
      const selected = methodResult.value.data;
      method = {
        id: selected.id,
        label: selected.title || selected.code,
        is_active: selected.is_active,
      };
    }
    if (listResult.status === "rejected") throw listResult.reason;
    if (!listResult.value.status) throw new ApiError(t("loadFailed"), 502);
    result = listResult.value;
  } catch (error) {
    failure = (await handleActionError(error, t("loadFailed"))).message;
  }

  if (result && result.pagination.current_page > result.pagination.last_page) {
    const page = Math.max(1, result.pagination.last_page);
    redirect({
      href: {
        pathname: "/admin/crop-field-layouts",
        query: {
          ...Object.fromEntries(
            Object.entries(filters).filter(([, entry]) => entry !== ""),
          ),
          ...(page > 1 ? { page } : {}),
        },
      },
      locale: await getLocale(),
    });
  }

  const formKey = JSON.stringify(filters);
  return (
    <div className="min-w-0 space-y-5">
      {options && (
        <CropFieldLayoutFiltersForm
          key={formKey}
          filters={filters}
          options={options}
          crop={crop}
          method={method}
        />
      )}
      <CropFieldLayoutsList
        filters={filters}
        options={options}
        result={result}
        failure={failure}
      />
    </div>
  );
}
