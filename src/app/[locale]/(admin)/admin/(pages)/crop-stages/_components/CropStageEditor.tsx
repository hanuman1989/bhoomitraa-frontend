import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import {
  cropStagesAPI,
  getCropStageCropOptions,
} from "@/lib/apis/admin/cropStages";
import type { CropStage, CropStageCropOption } from "@/types/admin/cropStage";
import CropStageForm from "./CropStageForm";

export default async function CropStageEditor({ id }: { id?: string }) {
  const t = await getTranslations("cropStages");
  let stage: CropStage | null = null;
  let crops: CropStageCropOption[] = [];
  try {
    await requireAdmin();
    if (id !== undefined) {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
      const response = await cropStagesAPI.show(numericId);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      stage = response.data;
    } else crops = await getCropStageCropOptions(true);
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
  return <CropStageForm key={stage?.id ?? "new"} stage={stage} crops={crops} />;
}
