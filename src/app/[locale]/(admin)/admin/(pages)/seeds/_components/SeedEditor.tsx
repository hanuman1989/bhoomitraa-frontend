import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { seedsAPI } from "@/lib/apis/admin/seeds";
import {
  getTimelineOptions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import type { Seed, SeedStep } from "@/types/admin/seed";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import SeedForm from "./SeedForm";
import SeedHeader from "./SeedHeader";

export default async function SeedEditor({
  id,
  step = "1",
  viewOnly = false,
}: {
  id?: string;
  step?: string;
  viewOnly?: boolean;
}) {
  const t = await getTranslations("seeds");
  let seed: Seed | null = null;
  let choices: TimelineChoices = {},
    selections: TimelineSelections = {},
    canReview = false;
  const current = Number(step);
  try {
    const admin = await requireAdmin();
    canReview = admin.is_super_user;
    if (![1, 2, 3, 4].includes(current)) notFound();
    if (id !== undefined) {
      const number = Number(id);
      if (!Number.isSafeInteger(number) || number < 1) notFound();
      const response =
        current === 4 || viewOnly
          ? await seedsAPI.review(number)
          : await seedsAPI.show(number);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      seed = response.data;
      const next = Math.min(4, seed.completed_step + 1);
      if (!viewOnly && current > next)
        redirect({
          href: `/admin/seeds/${number}/step/${next}`,
          locale: await getLocale(),
        });
    } else if (current !== 1) notFound();
    if (!viewOnly && current === 1) {
      const [crop, variety] = await Promise.all([
        getTimelineOptions("crop", null, true),
        seed ? getTimelineOptions("variety", seed.crop_id, true) : undefined,
      ]);
      choices = { crop, variety };
      selections = seed
        ? await getTimelineSelections(choices, {
            crop: seed.crop_id,
            variety: seed.crop_variety_id,
          })
        : {};
    }
    if (!viewOnly && current === 3) {
      choices = {
        source: await getTimelineOptions(
          "source",
          null,
          seed?.verification_status === "verified",
        ),
      };
      selections = seed
        ? await getTimelineSelections(choices, { source: seed.source_id })
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
      <SeedHeader
        mode={
          viewOnly
            ? "view"
            : seed?.setup_status === "completed"
              ? "edit"
              : "create"
        }
      />
      <SeedForm
        key={`${seed?.id ?? "new"}-${current}-${viewOnly}`}
        initialSeed={seed}
        step={current as SeedStep}
        choices={choices}
        selections={selections}
        canReview={canReview}
        viewOnly={viewOnly}
      />
    </>
  );
}
