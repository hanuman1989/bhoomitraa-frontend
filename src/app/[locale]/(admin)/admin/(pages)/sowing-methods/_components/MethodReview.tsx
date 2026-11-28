import { useTranslations } from "next-intl";
import { getLanguage, languages } from "@/i18n/languages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import ImagePreview from "@/components/common/ImagePreview";
import {
  CameraIcon,
  ClipboardListIcon,
  LanguageIcon,
  PencilIcon,
  SproutIcon,
} from "@/icons";
import {
  sowingMethodPrimaryLocale,
  type SowingMethod,
  type SowingMethodOptions,
  type SowingMethodTranslation,
} from "@/types/admin/sowingMethod";

const reviewSectionClass =
  "space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800";
const reviewBodyClass = "sm:ps-12";

export default function MethodReview({
  method,
  options,
  active = method.is_active,
  busy,
  onEdit,
}: {
  method: SowingMethod;
  options: SowingMethodOptions;
  active?: boolean;
  busy?: boolean;
  onEdit?: (step: 1 | 2 | 3) => void;
}) {
  const t = useTranslations("sowingMethods");
  const primaryTitle =
    method.translations[sowingMethodPrimaryLocale]?.title ||
    method.title ||
    method.code;
  const title = onEdit ? primaryTitle : method.title || primaryTitle;
  const option = (items: SowingMethodOptions["cost_levels"], value: string) =>
    value === "varies"
      ? t("varies")
      : (items.find((item) => item.value === value)?.label ?? value);
  const flag = (value: boolean | null) =>
    t(value === null ? "unknown" : value ? "yes" : "no");

  function heading(label: string, step: 1 | 2 | 3, Icon: typeof PencilIcon) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
          <span className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300 inline-grid size-9 shrink-0 place-items-center rounded-lg">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          {label}
        </h4>
        {onEdit && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(step)}
            aria-label={t("editSection", { section: label })}
            className="focus-visible:outline-brand-500 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <PencilIcon aria-hidden="true" className="size-3.5" />
            {t("edit")}
          </button>
        )}
      </div>
    );
  }

  const fields = [
    ["title", primaryTitle],
    ["code", method.code],
    ["slug", method.slug],
    [
      "establishment_type",
      option(options.establishment_types, method.establishment_type),
    ],
    ["supports_row_spacing", flag(method.supports_row_spacing)],
    ["supports_plant_spacing", flag(method.supports_plant_spacing)],
    ["supports_field_layout", flag(method.supports_field_layout)],
    [
      "machinery_requirement",
      option(options.machinery_requirements, method.machinery_requirement),
    ],
    [
      "labour_requirement",
      option(options.labour_requirements, method.labour_requirement),
    ],
    ["cost_level", option(options.cost_levels, method.cost_level)],
    ["sort_order", method.sort_order],
  ] as const;
  const descriptions: (keyof SowingMethodTranslation)[] = [
    "description",
    "advantages",
    "disadvantages",
    "suitable_conditions",
    "resource_requirements",
    "economic_considerations",
    "important_considerations",
  ];

  return (
    <ComponentCard
      title={onEdit ? t("step4") : title}
      desc={onEdit ? t("reviewHelp") : undefined}
      className="shadow-theme-xs"
    >
      {!method.is_complete && (
        <div
          role="alert"
          className="border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-800 dark:bg-warning-500/10 dark:text-warning-300 rounded-xl border p-4 text-sm"
        >
          <p className="font-medium">{t("incomplete")}</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {[...new Set(Object.values(method.readiness_errors).flat())].map(
              (message) => (
                <li key={message}>{message}</li>
              ),
            )}
          </ul>
        </div>
      )}
      <section className="space-y-3">
        {heading(t("step1"), 1, ClipboardListIcon)}
        <dl
          className={`grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 ${reviewBodyClass}`}
        >
          {fields.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-xs text-gray-500 dark:text-gray-400">
                {t(`fields.${key}`)}
              </dt>
              <dd className="mt-1 text-sm font-medium break-words text-gray-800 dark:text-gray-100">
                {value}
              </dd>
            </div>
          ))}
          <div>
            <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              {t("fields.is_active")}
            </dt>
            <dd>
              <Badge color={active ? "success" : "warning"}>
                {t(active ? "active" : "inactive")}
              </Badge>
            </dd>
          </div>
        </dl>
      </section>
      <section className={reviewSectionClass}>
        {heading(t("step2"), 2, LanguageIcon)}
        <div className={`grid gap-3 md:grid-cols-2 ${reviewBodyClass}`}>
          {languages.map(({ id }) => {
            const content = method.translations[id];
            const language = getLanguage(id);
            return (
              <div
                key={id}
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <h5 className="bg-brand-50 dark:bg-brand-500/10 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span
                    aria-hidden="true"
                    className="bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 rounded-full px-2 py-0.5 text-xs uppercase"
                  >
                    {id}
                  </span>
                  {language.name}
                </h5>
                <div className="min-w-0 space-y-1 p-3 text-sm">
                  <p
                    lang={id}
                    dir={language.dir}
                    className="font-semibold wrap-break-word text-gray-900 dark:text-white"
                  >
                    {content?.title || t("notAvailable")}
                  </p>
                  {content?.short_description && (
                    <p
                      lang={id}
                      dir={language.dir}
                      className="wrap-break-word whitespace-pre-wrap text-gray-600 dark:text-gray-300"
                    >
                      {content.short_description}
                    </p>
                  )}
                  {content && descriptions.some((key) => content[key]) && (
                    <details className="pt-1">
                      <summary className="text-brand-600 dark:text-brand-300 cursor-pointer text-xs font-medium">
                        {t("viewTranslation")}
                      </summary>
                      <dl className="space-y-3 py-2">
                        {descriptions.map(
                          (key) =>
                            content[key] && (
                              <div key={key}>
                                <dt className="font-medium text-gray-800 dark:text-gray-200">
                                  {t(`fields.${key}`)}
                                </dt>
                                <dd
                                  lang={id}
                                  dir={language.dir}
                                  className="wrap-break-word whitespace-pre-wrap text-gray-600 dark:text-gray-300"
                                >
                                  {content[key]}
                                </dd>
                              </div>
                            ),
                        )}
                      </dl>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className={reviewSectionClass}>
        {heading(t("step3"), 3, CameraIcon)}
        {method.images.length ? (
          <ol
            aria-label={t("step3")}
            className={`flex flex-wrap gap-3 ${reviewBodyClass}`}
          >
            {method.images.map((image, index) => (
              <li
                key={image.id}
                className="relative aspect-video w-32 overflow-hidden rounded-lg sm:w-40"
              >
                <ImagePreview
                  src={image.image_url}
                  alt={t("imageAlt", { title, position: index + 1 })}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="bg-brand-500 absolute start-2 bottom-2 rounded-full px-2 py-1 text-xs font-medium text-white">
                    {t("primary")}
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p
            className={`text-sm text-gray-500 dark:text-gray-400 ${reviewBodyClass}`}
          >
            {t("noImages")}
          </p>
        )}
      </section>
      <section className={reviewSectionClass}>
        {heading(t("cropApplicability"), 1, SproutIcon)}
        <dl
          className={`flex flex-wrap items-start gap-x-6 gap-y-2 text-sm ${reviewBodyClass}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <dt className="font-medium text-gray-800 dark:text-gray-200">
              {t("applicableFor")}
            </dt>
            <dd>
              <Badge color="primary">
                {t(method.crop_scope === "all" ? "allCrops" : "specificCrops")}
              </Badge>
            </dd>
          </div>
          {method.crop_scope === "specific" && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <dt className="font-medium text-gray-800 dark:text-gray-200">
                {t("selectedCrops")}
              </dt>
              <dd className="flex min-w-0 flex-wrap gap-2">
                {method.crops.map((crop) => (
                  <Badge key={crop.id} color="primary">
                    {crop.name ?? crop.id}
                  </Badge>
                ))}
                {!method.crops.length && t("notAvailable")}
              </dd>
            </div>
          )}
        </dl>
      </section>
    </ComponentCard>
  );
}
