import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getLanguage, languages } from "@/i18n/languages";
import { requireAdmin } from "@/lib/auth/dal";
import { cropActivityTemplatesAPI } from "@/lib/apis/admin/cropActivityTemplates";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { CropActivityTemplate } from "@/types/admin/cropActivityTemplate";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import CropActivityTemplateRowActions from "./CropActivityTemplateRowActions";

export default async function CropActivityTemplateDetails({
  id,
}: {
  id: string;
}) {
  const t = await getTranslations("cropActivityTemplates");
  const tr = await getTranslations("stageTimelines.regions");
  let template: CropActivityTemplate;
  let canReview = false;
  try {
    const admin = await requireAdmin();
    canReview = admin.is_super_user;
    const numericId = Number(id);
    if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
    const response = await cropActivityTemplatesAPI.show(numericId);
    if (!response.status || !response.data?.id)
      throw new ApiError(t("feedback.loadFailed"), 502);
    template = response.data;
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("feedback.loadFailed"));
    return (
      <p
        role="alert"
        className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-5 text-sm"
      >
        {failure.message}
      </p>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {template.title ?? t("recordId", { id: template.id })}
        </h2>
        <CropActivityTemplateRowActions
          template={template}
          canReview={canReview}
        />
      </div>
      <ComponentCard title={t("form.basic")}>
        <dl className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.crop")}
            </dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
              {template.crop_name ?? t("recordId", { id: template.crop_id })}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.variety")}
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {template.crop_variety_name ?? t("allVarieties")}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.category")}
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {template.category_name ??
                t("recordId", { id: template.category_id })}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.stage")}
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {template.crop_stage_name ?? t("notAvailable")}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.season")}
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {template.season_name ??
                t("recordId", { id: template.season_id })}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.source")}
            </dt>
            <dd className="mt-1">
              <Link
                href={`/admin/knowledge-sources/${template.source_id}`}
                className="text-brand-500 dark:text-brand-400 hover:underline"
              >
                {template.source_title ??
                  t("recordId", { id: template.source_id })}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.schedule")}
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {t(`schedule.${template.schedule_type}`)}
              <p>
                {t("daysRange", {
                  min: template.start_offset_days,
                  max: template.end_offset_days,
                })}
              </p>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.priority")}
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {t(`priorities.${template.priority}`)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.status")}
            </dt>
            <dd className="mt-1">
              <Badge color={template.is_active ? "success" : "light"}>
                {t(template.is_active ? "active" : "inactive")}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t("fields.addedAt")}
            </dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">
              {template.added_at ?? t("notAvailable")}
            </dd>
          </div>
        </dl>
      </ComponentCard>
      <ComponentCard title={tr("title")}>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {tr(template.region_scope === "all" ? "all" : "specific")}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tr(template.region_scope === "all" ? "warning" : "legacy")}
        </p>
        {template.region_scope === "specific" && (
          <ul className="flex flex-wrap gap-2">
            {template.regions.map((region) => (
              <li key={region.id}>
                <Badge color="primary">
                  {region.name ?? t("recordId", { id: region.id })}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </ComponentCard>
      <ComponentCard title={t("translations.title")}>
        <div className="space-y-4">
          {Object.entries(template.translations).map(([locale, fields]) => {
            const language = languages.some(
              (language) => language.id === locale,
            )
              ? getLanguage(locale)
              : { name: locale, dir: "ltr" as const };
            return (
              <section
                key={locale}
                lang={locale}
                dir={language.dir}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <h3 className="text-brand-500 dark:text-brand-400 text-sm font-semibold">
                  {language.name} ({locale})
                </h3>
                <h4 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
                  {fields.title}
                </h4>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t("translations.description")}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {fields.description ?? t("notAvailable")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t("translations.instructions")}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {fields.instructions ?? t("notAvailable")}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </ComponentCard>
      <Link
        href="/admin/crop-activity-templates"
        className="text-brand-500 dark:text-brand-400 inline-block text-sm font-medium hover:underline"
      >
        {t("back")}
      </Link>
    </div>
  );
}
