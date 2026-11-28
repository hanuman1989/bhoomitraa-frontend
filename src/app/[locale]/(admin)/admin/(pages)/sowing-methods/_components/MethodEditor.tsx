import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import { sowingMethodsAPI } from "@/lib/apis/admin/sowingMethods";
import { getTimelineOptions } from "@/lib/apis/admin/cropStageTimelines";
import type {
  SowingMethod,
  SowingMethodOptions,
} from "@/types/admin/sowingMethod";
import type { TimelineOptionPage } from "@/types/admin/cropStageTimeline";
import MethodReview from "./MethodReview";
import SowingMethodForm from "./SowingMethodForm";

export default async function MethodEditor({
  id,
  viewOnly = false,
}: {
  id?: string;
  viewOnly?: boolean;
}) {
  const t = await getTranslations("sowingMethods");
  const methodId = Number(id);
  if (
    id !== undefined &&
    (!/^\d+$/.test(id) || !Number.isSafeInteger(methodId) || methodId < 1)
  )
    notFound();
  let options: SowingMethodOptions;
  let method: SowingMethod | null;
  let crops: TimelineOptionPage | undefined;
  try {
    await requireAdmin();
    const [optionResponse, detail, cropOptions] = await Promise.all([
      sowingMethodsAPI.options(),
      id !== undefined ? sowingMethodsAPI.show(methodId) : undefined,
      viewOnly ? undefined : getTimelineOptions("crop", null, true),
    ]);
    if (!optionResponse.status || (detail && !detail.status))
      throw new ApiError(t("loadFailed"), 502);
    options = optionResponse.data;
    method = detail?.data ?? null;
    crops = cropOptions;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("loadFailed"));
    return (
      <p
        role="alert"
        className="bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300 rounded-xl p-4 text-sm"
      >
        {failure.message}
      </p>
    );
  }
  if (viewOnly && method) {
    return (
      <>
        <MethodReview method={method} options={options} />
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/sowing-methods"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            {t("back")}
          </Link>
          <Link
            href={`/admin/sowing-methods/${methodId}/edit`}
            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            {t("edit")}
          </Link>
        </div>
      </>
    );
  }
  return crops ? (
    <SowingMethodForm
      key={method?.id ?? "new"}
      initialMethod={method}
      options={options}
      crops={crops}
    />
  ) : null;
}
