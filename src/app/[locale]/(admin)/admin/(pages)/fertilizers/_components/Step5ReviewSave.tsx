"use client";

import { useTranslations } from "next-intl";
import { languages, getLanguage } from "@/i18n/languages";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import ImagePreview from "@/components/common/ImagePreview";
import type { ActionResult, ApiValidationErrors } from "@/types/api";
import type { Fertilizer, FertilizerStep } from "@/types/admin/fertilizer";

const sectionClass =
  "rounded-xl shadow-theme-xs [&>div:first-child]:py-3 [&_h3]:text-xl [&_h3]:font-semibold";
export default function Step5ReviewSave({
  fertilizer,
  busy,
  canReview,
  viewOnly,
  errors,
  onEdit,
  onSave,
}: {
  fertilizer: Fertilizer;
  busy: boolean;
  canReview: boolean;
  viewOnly: boolean;
  errors: ApiValidationErrors;
  onEdit: (step: FertilizerStep) => void;
  onSave: () => Promise<ActionResult<Fertilizer>>;
}) {
  const t = useTranslations("fertilizers"),
    missing = t("notAvailable");
  const locales = [
    ...new Set([
      ...languages.map(({ id }) => id),
      ...Object.keys(fertilizer.translations),
    ]),
  ];
  const issues = { ...fertilizer.readiness_errors, ...errors };
  const reviewHeader = (title: string, step: FertilizerStep) => (
    <span className="flex items-center justify-between gap-3">
      <span>{title}</span>
      {!viewOnly && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onEdit(step)}
          className="text-brand-500 text-sm font-medium disabled:opacity-50"
        >
          {t("edit")}
        </button>
      )}
    </span>
  );
  return (
    <form
      id="fertilizer-step-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !busy &&
          !viewOnly &&
          fertilizer.ready_to_finalize &&
          (canReview || !fertilizer.requested_is_active)
        )
          void onSave();
      }}
      className="space-y-5"
      aria-busy={busy}
    >
      <ComponentCard
        title={reviewHeader(t("wizard.step1"), 1)}
        className={sectionClass}
      >
        <dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4 [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-gray-600 dark:[&_dd]:text-gray-400 [&_dt]:font-semibold [&_dt]:text-gray-900 dark:[&_dt]:text-gray-100">
          <div>
            <dt>{t("fields.name")}</dt>
            <dd>
              {viewOnly
                ? (fertilizer.name ?? missing)
                : (fertilizer.translations[routing.defaultLocale]?.name ??
                  missing)}
            </dd>
          </div>
          <div>
            <dt>{t("fields.slug")}</dt>
            <dd>{fertilizer.slug}</dd>
          </div>
          <div>
            <dt>{t("fields.fertilizer_code")}</dt>
            <dd>{fertilizer.fertilizer_code ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.fertilizer_type")}</dt>
            <dd>{t(`types.${fertilizer.fertilizer_type}`)}</dd>
          </div>
          <div>
            <dt>{t("fields.form")}</dt>
            <dd>{t(`forms.${fertilizer.form}`)}</dd>
          </div>
          <div>
            <dt>{t("fields.grade")}</dt>
            <dd>{fertilizer.grade ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.brand_name")}</dt>
            <dd>{fertilizer.brand_name ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.manufacturer_name")}</dt>
            <dd>{fertilizer.manufacturer_name ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.default_unit_code")}</dt>
            <dd>{t(`units.${fertilizer.default_unit_code}`)}</dd>
          </div>
          <div>
            <dt>{t("fields.reference_pack_quantity")}</dt>
            <dd>{fertilizer.reference_pack_quantity ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.reference_pack_unit_code")}</dt>
            <dd>
              {fertilizer.reference_pack_unit_code
                ? t(`units.${fertilizer.reference_pack_unit_code}`)
                : missing}
            </dd>
          </div>
          <div>
            <dt>{t("fields.application_method")}</dt>
            <dd>
              {fertilizer.application_method
                ? t(`methods.${fertilizer.application_method}`)
                : missing}
            </dd>
          </div>
        </dl>
      </ComponentCard>
      <ComponentCard
        title={reviewHeader(t("wizard.step2"), 2)}
        className={sectionClass}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fertilizer.nutrients.map((row) => (
            <div
              key={row.id}
              className="bg-brand-25 dark:bg-brand-500/10 rounded-xl p-4"
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t(`nutrients.${row.nutrient_code}`)}
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {t("composition.valueLabel", {
                  nutrient: row.nutrient_code,
                  value: row.content_value,
                  unit: t(`contentUnits.${row.content_unit_code}`),
                })}
              </p>
            </div>
          ))}
        </div>
        {!fertilizer.nutrients.length && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("composition.emptySaved")}
          </p>
        )}
        {fertilizer.composition_notes && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <h4 className="font-semibold">{t("composition.notes")}</h4>
            <p className="mt-2 break-words whitespace-pre-wrap">
              {fertilizer.composition_notes}
            </p>
          </div>
        )}
      </ComponentCard>
      <ComponentCard
        title={reviewHeader(t("wizard.step3"), 3)}
        className={sectionClass}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {locales.map((id) => {
            const language = languages.some((language) => language.id === id)
                ? getLanguage(id)
                : { name: id, dir: "ltr" as const },
              fields = fertilizer.translations[id];
            return (
              <section
                key={id}
                lang={id}
                dir={language.dir}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  <span className="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 me-2 rounded-full px-2 py-0.5 text-xs uppercase">
                    {id}
                  </span>
                  {language.name}
                </h3>
                <dl className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <dt className="font-medium">{t("translations.name")}</dt>
                    <dd className="mt-1 break-words">
                      {fields?.name || missing}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">
                      {t("translations.descriptionLabel")}
                    </dt>
                    <dd className="mt-1 break-words whitespace-pre-wrap">
                      {fields?.description ?? missing}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">
                      {t("translations.instructions")}
                    </dt>
                    <dd className="mt-1 break-words whitespace-pre-wrap">
                      {fields?.usage_instructions ?? missing}
                    </dd>
                  </div>
                </dl>
              </section>
            );
          })}
        </div>
      </ComponentCard>
      <ComponentCard
        title={reviewHeader(t("wizard.step4"), 4)}
        className={sectionClass}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fertilizer.images.map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-xl"
              >
                <ImagePreview
                  src={image.image_url}
                  alt={
                    image.alt_text ??
                    fertilizer.name ??
                    t("media.imageAlt", { number: index + 1 })
                  }
                  fill
                  sizes="(min-width: 1024px) 150px, 25vw"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="bg-brand-500 absolute start-1 bottom-1 rounded-full px-2 py-1 text-xs text-white">
                    {t("media.primary")}
                  </span>
                )}
              </div>
            ))}
            {!fertilizer.images.length && (
              <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
                {t("media.empty")}
              </p>
            )}
          </div>
          <dl className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex flex-wrap justify-between gap-3">
              <dt>{t("fields.source_id")}</dt>
              <dd>
                {fertilizer.source_id ? (
                  <Link
                    href={`/admin/knowledge-sources/${fertilizer.source_id}`}
                    className="text-brand-500 hover:underline"
                  >
                    {fertilizer.source?.title ??
                      t("recordId", { id: fertilizer.source_id })}
                  </Link>
                ) : (
                  missing
                )}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <dt>{t("fields.verification_status")}</dt>
              <dd>
                <Badge
                  color={
                    fertilizer.verification_status === "verified"
                      ? "success"
                      : fertilizer.verification_status === "pending"
                        ? "warning"
                        : "error"
                  }
                >
                  {t(`verification.${fertilizer.verification_status}`)}
                </Badge>
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <dt>{t("review.requestedStatus")}</dt>
              <dd>
                <Badge
                  color={fertilizer.requested_is_active ? "success" : "light"}
                >
                  {t(fertilizer.requested_is_active ? "active" : "inactive")}
                </Badge>
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <dt>{t("fields.setup_status")}</dt>
              <dd>{t(`setup.${fertilizer.setup_status}`)}</dd>
            </div>
          </dl>
        </div>
      </ComponentCard>
      {!viewOnly && (
        <div
          className={`rounded-xl border p-5 ${fertilizer.ready_to_finalize ? "border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-500/10" : "border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-500/10"}`}
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t(
              fertilizer.ready_to_finalize
                ? "review.ready"
                : fertilizer.setup_status === "completed"
                  ? "review.completed"
                  : "review.notReady",
            )}
          </h3>
          <div className="mt-2 flex flex-wrap gap-5 text-sm text-gray-700 dark:text-gray-300">
            <span>
              {t("review.nutrientCount", {
                count: fertilizer.nutrients.length,
              })}
            </span>
            <span>
              {t("review.translationCount", {
                count: Object.keys(fertilizer.translations).length,
              })}
            </span>
            <span>
              {t("review.imageCount", { count: fertilizer.images.length })}
            </span>
          </div>
          {Object.keys(issues).length > 0 && (
            <ul
              role="alert"
              className="text-error-700 dark:text-error-300 mt-3 list-disc space-y-2 ps-5 text-sm"
            >
              {Object.entries(issues).flatMap(([field, messages]) =>
                messages.map((message, index) => {
                  const step: FertilizerStep =
                    field.startsWith("nutrients") ||
                    field === "composition_notes"
                      ? 2
                      : field.startsWith("translations")
                        ? 3
                        : /^(images|image_order|retain_image_ids|remove_image_ids|source_id|verification_status|is_active|requested_is_active|completed_step)/.test(
                              field,
                            )
                          ? 4
                          : field === "setup_status"
                            ? 5
                            : 1;
                  return (
                    <li key={`${field}-${index}`}>
                      <span>{message}</span>
                      {step < 5 && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onEdit(step)}
                          className="text-brand-600 dark:text-brand-300 ms-2 underline disabled:opacity-50"
                        >
                          {t("review.fixStep", {
                            step: t(`wizard.step${step}`),
                          })}
                        </button>
                      )}
                    </li>
                  );
                }),
              )}
            </ul>
          )}
          {!canReview && fertilizer.requested_is_active && (
            <p className="text-error-700 dark:text-error-300 mt-3 text-sm">
              {t("feedback.reviewRequired")}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
