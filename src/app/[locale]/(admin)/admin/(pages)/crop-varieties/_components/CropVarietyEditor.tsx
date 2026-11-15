import { getTranslations } from "next-intl/server";
import type { ComponentProps } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import { cropVarietiesAPI } from "@/lib/apis/admin/cropVarieties";
import { cropsAPI } from "@/lib/apis/admin/crops";
import { knowledgeSourcesAPI } from "@/lib/apis/admin/knowledgeSources";
import type { PageSearchParams } from "@/types/api";
import CropVarietyForm from "./CropVarietyForm";

export default async function CropVarietyEditor({
  id,
  searchParams,
}: {
  id?: string;
  searchParams?: Promise<PageSearchParams>;
}) {
  const t = await getTranslations("cropVarieties");
  const params = searchParams ? await searchParams : {};
  const cropIdParam = params.crop_id;
  const cropIdValue = Array.isArray(cropIdParam)
    ? cropIdParam[0]
    : cropIdParam;
  const parsedCropId = Number(cropIdValue);
  const queryCropId =
    id === undefined &&
    Number.isSafeInteger(parsedCropId) &&
    parsedCropId > 0
      ? parsedCropId
      : null;
  let data: ComponentProps<typeof CropVarietyForm>;
  try {
    await requireAdmin();
    const numericId = id === undefined ? null : Number(id);
    if (
      numericId !== null &&
      (!Number.isSafeInteger(numericId) || numericId < 1)
    )
      notFound();
    const [response, cropOptions, sourceOptions] = await Promise.all([
      numericId === null
        ? Promise.resolve(null)
        : cropVarietiesAPI.show(numericId),
      cropsAPI.list({ is_active: 1, page: 1, per_page: 20 }),
      knowledgeSourcesAPI.list({
        sort_by: "title",
        sort_direction: "asc",
        page: 1,
        per_page: 20,
      }),
    ]);
    if (
      (response && (!response.status || !response.data?.id)) ||
      !cropOptions.status ||
      !sourceOptions.status
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    const variety = response?.data ?? null;
    const [crop, initialSources] = await Promise.all([
      variety
        ? cropsAPI.show(variety.crop_id).catch((error: unknown) => {
            if (error instanceof ApiError && error.status === 404) return null;
            throw error;
          })
        : queryCropId
          ? cropsAPI.show(queryCropId).catch((error: unknown) => {
              if (error instanceof ApiError && error.status === 404) return null;
              throw error;
            })
          : Promise.resolve(null),
      Promise.all(
          (variety?.knowledge_sources ?? []).map(async (source) => {
            try {
              const response = await knowledgeSourcesAPI.show(source.id);
              if (!response.status || !response.data?.id)
                throw new ApiError(t("feedback.loadFailed"), 502);
              return response.data;
            } catch (error: unknown) {
              if (error instanceof ApiError && error.status === 404) return source;
              throw error;
            }
          }),
      ),
    ]);
    if ((crop && !crop.status) || !sourceOptions.status)
      throw new ApiError(t("feedback.loadFailed"), 502);
    data = {
      variety,
      cropOptions,
      sourceOptions,
      initialCrop: crop?.data ?? null,
      initialSources,
    };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("feedback.loadFailed"));
    return (
      <p
        role="alert"
        className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
      >
        {failure.message}
      </p>
    );
  }
  return <CropVarietyForm key={data.variety?.id ?? "new"} {...data} />;
}
