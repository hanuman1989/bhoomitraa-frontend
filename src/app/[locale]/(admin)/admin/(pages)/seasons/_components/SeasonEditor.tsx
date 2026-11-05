import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import { seasonsAPI } from "@/lib/apis/admin/seasons";
import type { Season } from "@/types/admin/season";
import SeasonForm from "./SeasonForm";

export default async function SeasonEditor({ id }: { id?: string }) {
  const t = await getTranslations("seasons");
  let season: Season | null = null;
  try {
    await requireAdmin();
    if (id !== undefined) {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
      const response = await seasonsAPI.show(numericId);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      season = response.data;
    }
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
  return <SeasonForm key={season?.id ?? "new"} season={season} />;
}
