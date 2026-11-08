import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { seedLotsAPI } from "@/lib/apis/admin/seedLots";
import { getTimelineOptions } from "@/lib/apis/admin/cropStageTimelines";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { SeedLot } from "@/types/admin/seedLot";
import type {
  TimelineOption,
  TimelineOptionPage,
} from "@/types/admin/cropStageTimeline";
import SeedLotForm from "./SeedLotForm";
import SeedLotDetails from "./SeedLotDetails";

export default async function SeedLotEditor({
  id,
  viewOnly = false,
}: {
  id?: string;
  viewOnly?: boolean;
}) {
  const t = await getTranslations("seedLots");
  let lot: SeedLot | null = null,
    choices: TimelineOptionPage | undefined,
    selection: TimelineOption | null = null,
    canReview = false;
  try {
    canReview = (await requireAdmin()).is_super_user;
    if (id !== undefined) {
      const number = Number(id);
      if (!Number.isSafeInteger(number) || number < 1) notFound();
      const response = await seedLotsAPI.show(number);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      lot = response.data;
    }
    if (!viewOnly) {
      choices = await getTimelineOptions("seed", null, true);
      const seedId = lot?.seed_id;
      if (lot)
        selection = choices.options.find((option) => option.id === seedId) ?? {
          id: lot.seed_id,
          label: lot.seed?.name ?? t("recordId", { id: lot.seed_id }),
          is_active: lot.seed?.is_active ?? false,
          seed: lot.seed ?? undefined,
        };
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
  return viewOnly && lot ? (
    <SeedLotDetails lot={lot} canReview={canReview} />
  ) : (
    <SeedLotForm
      key={lot?.id ?? "new"}
      lot={lot}
      choices={choices}
      selection={selection}
      canReview={canReview}
    />
  );
}
