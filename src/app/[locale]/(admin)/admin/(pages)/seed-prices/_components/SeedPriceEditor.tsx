import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { seedPricesAPI } from "@/lib/apis/admin/seedPrices";
import {
  getTimelineOption,
  getTimelineOptions,
  getTimelineRegions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { SeedPrice } from "@/types/admin/seedPrice";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import SeedPriceForm from "./SeedPriceForm";
import SeedPriceDetails from "./SeedPriceDetails";

export default async function SeedPriceEditor({
  id,
  viewOnly = false,
}: {
  id?: string;
  viewOnly?: boolean;
}) {
  const t = await getTranslations("seedPrices");
  let price: SeedPrice | null = null,
    choices: TimelineChoices = {},
    selections: TimelineSelections = {},
    states: TimelineState[] = [],
    canReview = false;
  try {
    canReview = (await requireAdmin()).is_super_user;
    if (id !== undefined) {
      const number = Number(id);
      if (!Number.isSafeInteger(number) || number < 1) notFound();
      const response = await seedPricesAPI.show(number);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      price = response.data;
    }
    if (!viewOnly && !(price?.is_active && !canReview)) {
      const [seed, source, regions] = await Promise.all([
        getTimelineOptions("seed", null, true),
        getTimelineOptions("source", null, true),
        getTimelineRegions(price?.regions ?? []),
      ]);
      choices = { seed, source };
      states = regions;
      selections = await getTimelineSelections(
        { source },
        { source: price?.source_id ?? null },
      );
      if (price) {
        const seedId = price.seed_id;
        selections.seed = seed.options.find((option) => option.id === seedId);
        if (!selections.seed) {
          try {
            selections.seed = await getTimelineOption("seed", seedId);
          } catch (error: unknown) {
            if (!(error instanceof ApiError) || error.status !== 404)
              throw error;
            selections.seed = {
              id: seedId,
              label: price.seed?.name ?? t("recordId", { id: seedId }),
              is_active: false,
            };
          }
        }
      }
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
  return price && (viewOnly || (price.is_active && !canReview)) ? (
    <>
      {!viewOnly && (
        <p
          role="status"
          className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 mb-5 rounded-xl p-4 text-sm"
        >
          {t("form.locked")}
        </p>
      )}
      <SeedPriceDetails price={price} canReview={canReview} />
    </>
  ) : (
    <SeedPriceForm
      key={price?.id ?? "new"}
      price={price}
      choices={choices}
      selections={selections}
      states={states}
      canReview={canReview}
    />
  );
}
