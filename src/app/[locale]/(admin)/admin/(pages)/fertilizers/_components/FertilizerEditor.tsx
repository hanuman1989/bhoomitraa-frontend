import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { fertilizersAPI } from "@/lib/apis/admin/fertilizers";
import {
  getTimelineOptions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import type { Fertilizer, FertilizerStep } from "@/types/admin/fertilizer";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import FertilizerForm from "./FertilizerForm";
import FertilizerHeader from "./FertilizerHeader";

export default async function FertilizerEditor({
  id,
  step = "1",
  viewOnly = false,
}: {
  id?: string;
  step?: string;
  viewOnly?: boolean;
}) {
  const t = await getTranslations("fertilizers");
  let fertilizer: Fertilizer | null = null;
  let choices: TimelineChoices = {},
    selections: TimelineSelections = {},
    canReview = false;
  const current = Number(step);
  try {
    const admin = await requireAdmin();
    canReview = admin.is_super_user;
    if (![1, 2, 3, 4, 5].includes(current)) notFound();
    if (id !== undefined) {
      const number = Number(id);
      if (!Number.isSafeInteger(number) || number < 1) notFound();
      const response =
        current === 5 && !viewOnly
          ? await fertilizersAPI.review(number)
          : await fertilizersAPI.show(number);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      fertilizer = response.data;
      const next = Math.min(5, fertilizer.completed_step + 1);
      if (!viewOnly && current > next)
        redirect({
          href: `/admin/fertilizers/${number}/step/${next}`,
          locale: await getLocale(),
        });
    } else if (current !== 1) notFound();
    if (!viewOnly && current === 4) {
      choices = {
        source: await getTimelineOptions(
          "source",
          null,
          fertilizer?.verification_status === "verified",
        ),
      };
      selections = fertilizer
        ? await getTimelineSelections(choices, { source: fertilizer.source_id })
        : {};
    }
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("feedback.loadFailed"));
    return (
      <p
        role="alert"
        className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-5"
      >
        {failure.message}
      </p>
    );
  }
  return (
    <>
      <FertilizerHeader
        mode={
          viewOnly
            ? "view"
            : fertilizer?.setup_status === "completed"
              ? "edit"
              : "create"
        }
      />
      <FertilizerForm
        key={`${fertilizer?.id ?? "new"}-${current}-${viewOnly}`}
        initialFertilizer={fertilizer}
        step={current as FertilizerStep}
        choices={choices}
        selections={selections}
        canReview={canReview}
        viewOnly={viewOnly}
      />
    </>
  );
}
