"use client";

import { useTranslations } from "next-intl";
import { languages, getLanguage } from "@/i18n/languages";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import ImagePreview from "@/components/common/ImagePreview";
import type { ActionResult, ApiValidationErrors } from "@/types/api";
import type { Seed, SeedStep } from "@/types/admin/seed";

const sectionClass = "rounded-xl shadow-theme-xs [&>div:first-child]:py-3";
export default function Step4ReviewSave({
  seed,
  busy,
  canReview,
  viewOnly,
  errors,
  onEdit,
  onSave,
}: {
  seed: Seed;
  busy: boolean;
  canReview: boolean;
  viewOnly: boolean;
  errors: ApiValidationErrors;
  onEdit: (step: SeedStep) => void;
  onSave: () => Promise<ActionResult<Seed>>;
}) {
  const t = useTranslations("seeds"),
    missing = t("notAvailable");
  const locales = [
    ...new Set([
      ...languages.map(({ id }) => id),
      ...Object.keys(seed.translations),
    ]),
  ];
  const issues = { ...seed.readiness_errors, ...errors };
  const reviewHeader = (title: string, step: SeedStep) => (
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
      id="seed-step-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !busy &&
          seed.ready_to_finalize &&
          (canReview || !seed.requested_is_active)
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
        <dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4 [&_dd]:mt-1 [&_dd]:text-gray-600 dark:[&_dd]:text-gray-400 [&_dt]:font-semibold [&_dt]:text-gray-900 dark:[&_dt]:text-gray-100">
          <div>
            <dt>{t("fields.crop_id")}</dt>
            <dd>{seed.crop_name ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.crop_variety_id")}</dt>
            <dd>{seed.crop_variety_name ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.name")}</dt>
            <dd>{seed.translations[routing.defaultLocale]?.name ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.slug")}</dt>
            <dd>{seed.slug}</dd>
          </div>
          <div>
            <dt>{t("fields.sku")}</dt>
            <dd>{seed.sku ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.brand_name")}</dt>
            <dd>{seed.brand_name ?? missing}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt>{t("fields.producer_name")}</dt>
            <dd>{seed.producer_name ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.material_type")}</dt>
            <dd>{t(`materials.${seed.material_type}`)}</dd>
          </div>
          <div>
            <dt>{t("fields.seed_type")}</dt>
            <dd>
              {seed.seed_type ? t(`seedTypes.${seed.seed_type}`) : missing}
            </dd>
          </div>
          <div>
            <dt>{t("fields.propagation_method")}</dt>
            <dd>
              {seed.propagation_method
                ? t(`propagation.${seed.propagation_method}`)
                : missing}
            </dd>
          </div>
          <div>
            <dt>{t("fields.seed_class")}</dt>
            <dd>
              {seed.seed_class ? t(`classes.${seed.seed_class}`) : missing}
            </dd>
          </div>
          <div>
            <dt>{t("fields.treatment_status")}</dt>
            <dd>{t(`treatments.${seed.treatment_status}`)}</dd>
          </div>
          <div>
            <dt>{t("fields.default_unit_code")}</dt>
            <dd>{t(`units.${seed.default_unit_code}`)}</dd>
          </div>
          <div>
            <dt>{t("fields.reference_pack_quantity")}</dt>
            <dd>{seed.reference_pack_quantity ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.reference_pack_unit_code")}</dt>
            <dd>
              {seed.reference_pack_unit_code
                ? t(`units.${seed.reference_pack_unit_code}`)
                : missing}
            </dd>
          </div>
          <div>
            <dt>{t("fields.germination_reference_pct")}</dt>
            <dd>{seed.germination_reference_pct ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.purity_reference_pct")}</dt>
            <dd>{seed.purity_reference_pct ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.seeds_per_gram")}</dt>
            <dd>{seed.seeds_per_gram ?? missing}</dd>
          </div>
          <div>
            <dt>{t("fields.is_f1_hybrid")}</dt>
            <dd>
              {t(
                seed.is_f1_hybrid === null
                  ? "unknown"
                  : seed.is_f1_hybrid
                    ? "yes"
                    : "no",
              )}
            </dd>
          </div>
          <div>
            <dt>{t("fields.is_organic")}</dt>
            <dd>
              {t(
                seed.is_organic === null
                  ? "unknown"
                  : seed.is_organic
                    ? "yes"
                    : "no",
              )}
            </dd>
          </div>
          <div>
            <dt>{t("fields.is_pelleted")}</dt>
            <dd>
              {t(
                seed.is_pelleted === null
                  ? "unknown"
                  : seed.is_pelleted
                    ? "yes"
                    : "no",
              )}
            </dd>
          </div>
        </dl>
      </ComponentCard>
      <ComponentCard
        title={reviewHeader(t("wizard.step2"), 2)}
        className={sectionClass}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {locales.map((id) => {
            const language = languages.some((language) => language.id === id)
              ? getLanguage(id)
              : { name: id, dir: "ltr" as const };
            const fields = seed.translations[id];
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
                    <dd className="mt-1">{fields?.name || missing}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">
                      {t("translations.descriptionLabel")}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap">
                      {fields?.description ?? missing}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">
                      {t("translations.instructions")}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap">
                      {fields?.planting_instructions ?? missing}
                    </dd>
                  </div>
                </dl>
              </section>
            );
          })}
        </div>
      </ComponentCard>
      <ComponentCard
        title={reviewHeader(t("wizard.step3"), 3)}
        className={sectionClass}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {seed.images.map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-xl"
              >
                <ImagePreview
                  src={image.image_url}
                  alt={
                    image.alt_text ??
                    seed.name ??
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
            {!seed.images.length && (
              <p className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
                {t("media.empty")}
              </p>
            )}
          </div>
          <dl className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex flex-wrap justify-between gap-3">
              <dt>{t("fields.source_id")}</dt>
              <dd>
                {seed.source_id ? (
                  <Link
                    href={`/admin/knowledge-sources/${seed.source_id}`}
                    className="text-brand-500 dark:text-brand-300 hover:underline"
                  >
                    {seed.source?.title ??
                      t("recordId", { id: seed.source_id })}
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
                    seed.verification_status === "verified"
                      ? "success"
                      : seed.verification_status === "pending"
                        ? "warning"
                        : "error"
                  }
                >
                  {t(`verification.${seed.verification_status}`)}
                </Badge>
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <dt>{t("review.requestedStatus")}</dt>
              <dd>
                <Badge color={seed.requested_is_active ? "success" : "light"}>
                  {t(seed.requested_is_active ? "active" : "inactive")}
                </Badge>
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <dt>{t("fields.setup_status")}</dt>
              <dd>{t(`setup.${seed.setup_status}`)}</dd>
            </div>
          </dl>
        </div>
      </ComponentCard>
      {!viewOnly && (
        <div
          className={`rounded-xl border p-5 ${seed.ready_to_finalize ? "border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-500/10" : "border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-500/10"}`}
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t(seed.ready_to_finalize ? "review.ready" : "review.notReady")}
          </h3>
          <div className="mt-2 flex flex-wrap gap-5 text-sm text-gray-700 dark:text-gray-300">
            <span>
              {t("review.translationCount", {
                count: Object.keys(seed.translations).length,
              })}
            </span>
            <span>{t("review.imageCount", { count: seed.images.length })}</span>
          </div>
          {Object.keys(issues).length > 0 && (
            <ul
              role="alert"
              className="text-error-700 dark:text-error-300 mt-3 list-disc space-y-2 ps-5 text-sm"
            >
              {Object.entries(issues).flatMap(([field, messages]) =>
                messages.map((message, index) => (
                  <li key={`${field}-${index}`}>
                    <span className="font-medium">
                      {t.has(`fields.${field}`) ? t(`fields.${field}`) : field}
                      :{" "}
                    </span>
                    {message}
                  </li>
                )),
              )}
            </ul>
          )}
          {!canReview && seed.requested_is_active && (
            <p className="text-error-700 dark:text-error-300 mt-3 text-sm">
              {t("feedback.reviewRequired")}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
