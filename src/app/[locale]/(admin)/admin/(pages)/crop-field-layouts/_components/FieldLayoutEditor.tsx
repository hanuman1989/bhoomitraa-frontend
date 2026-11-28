import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import { cropFieldLayoutsAPI } from "@/lib/apis/admin/cropFieldLayouts";
import { getTimelineOptions } from "@/lib/apis/admin/cropStageTimelines";
import type {
  CropFieldLayout,
  CropFieldLayoutOptions,
  CropFieldLayoutReview,
  CropFieldLayoutSections,
  FieldLayoutStep,
} from "@/types/admin/cropFieldLayout";
import type { TimelineOptionPage } from "@/types/admin/cropStageTimeline";
import FieldLayoutForm from "./FieldLayoutForm";
import FieldLayoutReview from "./FieldLayoutReview";

const listPath = "/admin/crop-field-layouts";

function savedSections(layout: CropFieldLayout): CropFieldLayoutSections {
  return {
    basic_details: {
      crop_scope: layout.crop_scope,
      crop_ids: layout.crops.map(({ id }) => id),
      crop_variety_id: layout.crop_variety_id,
      crop_variety: layout.crop_variety,
      sowing_method_id: layout.sowing_method_id,
      sowing_method: layout.sowing_method,
      farming_type: layout.farming_type,
      farming_type_label: layout.farming_type_label,
      growing_system: layout.growing_system,
      growing_system_label: layout.growing_system_label,
      layout_type: layout.layout_type,
      layout_type_label: layout.layout_type_label,
      sort_order: layout.sort_order,
      is_active: layout.is_active,
      requested_is_active: layout.wizard.requested_is_active,
      crops: layout.crops,
    },
    layout_configuration: {
      layout_type: layout.layout_type,
      configuration_version: layout.configuration_version,
      configuration: layout.configuration,
      reference_note: layout.reference_note,
      definition: layout.configuration_definition,
    },
    translations: layout.translations,
  };
}

export default async function FieldLayoutEditor({
  id,
  requestedStep,
  viewOnly = false,
}: {
  id?: string;
  requestedStep?: string | string[];
  viewOnly?: boolean;
}) {
  const t = await getTranslations("cropFieldLayouts");
  const layoutId = id === undefined ? null : Number(id);
  if (
    layoutId !== null &&
    (!/^\d+$/.test(id ?? "") || !Number.isSafeInteger(layoutId) || layoutId < 1)
  )
    notFound();

  let layout: CropFieldLayout | null;
  let options: CropFieldLayoutOptions;
  let step: FieldLayoutStep = 1;
  let crops: TimelineOptionPage | undefined;
  let review: CropFieldLayoutReview | undefined;
  try {
    await requireAdmin();
    const [choices, detail] = await Promise.all([
      cropFieldLayoutsAPI.options(),
      layoutId === null ? null : cropFieldLayoutsAPI.show(layoutId),
    ]);
    if (!choices.status || (detail && !detail.status))
      throw new ApiError(t("loadFailed"), 502);
    options = choices.data;
    layout = detail?.data ?? null;

    if (layout && !viewOnly) {
      const maximum = Math.min(4, layout.wizard.completed_step + 1);
      const resume = layout.wizard.is_finalized ? 1 : maximum;
      const chosen = Number(requestedStep);
      const valid =
        typeof requestedStep === "string" &&
        /^[1-4]$/.test(requestedStep) &&
        chosen <= maximum;
      step = (valid ? chosen : resume) as FieldLayoutStep;
      if (requestedStep !== undefined && !valid) {
        redirect({
          href: `${listPath}/${layout.id}/edit?step=${step}`,
          locale: await getLocale(),
        });
      }
    }

    if (!viewOnly && step === 1) {
      crops = await getTimelineOptions("crop", null, true);
    }
    if (layout && !viewOnly && step === 4) {
      const response = await cropFieldLayoutsAPI.review(layout.id);
      if (!response.status) throw new ApiError(t("loadFailed"), 502);
      review = response.data;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("loadFailed"));
    return (
      <p
        role="alert"
        className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-4 text-sm"
      >
        {failure.message}
      </p>
    );
  }

  const saved = layout ? savedSections(layout) : null;
  const title = viewOnly
    ? (layout?.title ?? t("title"))
    : t(
        layout?.wizard.is_finalized || layout?.wizard.has_pending_edit
          ? "editTitle"
          : "createTitle",
      );
  return (
    <>
      <PageBreadcrumb
        pageTitle={title}
        description={viewOnly ? undefined : t("wizardDescription")}
        breadcrumbs={[
          { label: t("home"), href: "/admin/dashboard" },
          { label: t("title"), href: listPath },
          { label: title },
        ]}
      />
      {viewOnly && layout && saved ? (
        <FieldLayoutReview
          sections={saved}
          options={options}
          status={
            layout.wizard.is_finalized || layout.wizard.has_pending_edit
              ? layout.is_active
                ? "active"
                : "inactive"
              : "draft"
          }
          viewId={layout.id}
        />
      ) : (
        <FieldLayoutForm
          key={`${layout?.id ?? "new"}-${step}-${review?.wizard.revision ?? layout?.wizard.revision ?? 0}`}
          step={step}
          layout={layout}
          sections={review ?? layout?.draft ?? saved}
          review={review}
          options={options}
          crops={crops}
        />
      )}
    </>
  );
}
