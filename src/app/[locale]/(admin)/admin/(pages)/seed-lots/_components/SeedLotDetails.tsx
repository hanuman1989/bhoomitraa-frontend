import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import ImagePreview from "@/components/common/ImagePreview";
import type { SeedLot } from "@/types/admin/seedLot";
import SeedLotRowActions from "./SeedLotRowActions";

export default function SeedLotDetails({
  lot,
  canReview,
}: {
  lot: SeedLot;
  canReview: boolean;
}) {
  const t = useTranslations("seedLots"),
    formatter = useFormatter(),
    unavailable = t("notAvailable");
  const date = (value: string | null) =>
    value
      ? formatter.dateTime(new Date(`${value}T00:00:00Z`), {
          dateStyle: "medium",
          timeZone: "UTC",
        })
      : unavailable;
  const label = "text-xs text-gray-500 dark:text-gray-400",
    value =
      "mt-1 break-words text-sm font-medium text-gray-900 dark:text-gray-100";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {lot.lot_number}
          </h2>
          <Badge color={lot.is_active ? "success" : "error"}>
            {t(lot.is_active ? "active" : "inactive")}
          </Badge>
          <Badge
            color={
              lot.verification_status === "verified"
                ? "success"
                : lot.verification_status === "pending"
                  ? "warning"
                  : "error"
            }
          >
            {t(`verification.${lot.verification_status}`)}
          </Badge>
          <Badge
            color={
              lot.computed_validity_status === "valid"
                ? "success"
                : lot.computed_validity_status === "expired"
                  ? "error"
                  : lot.computed_validity_status === "expiring_soon"
                    ? "warning"
                    : "light"
            }
          >
            {t(`validity.${lot.computed_validity_status}`)}
          </Badge>
        </div>
        <SeedLotRowActions lot={lot} canReview={canReview} detail />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <ComponentCard title={t("form.basic")}>
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className={label}>{t("fields.seed_id")}</dt>
                <dd className={value}>
                  {lot.seed?.name ?? t("recordId", { id: lot.seed_id })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.lot_number")}</dt>
                <dd className={value}>{lot.lot_number}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.seed_class")}</dt>
                <dd className={value}>
                  {lot.seed_class
                    ? t(`classes.${lot.seed_class}`)
                    : unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.seed_treatment_status")}</dt>
                <dd className={value}>
                  {lot.seed_treatment_status
                    ? t(`treatments.${lot.seed_treatment_status}`)
                    : unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.production_date")}</dt>
                <dd className={value}>{date(lot.production_date)}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.test_date")}</dt>
                <dd className={value}>{date(lot.test_date)}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.valid_until")}</dt>
                <dd className={value}>{date(lot.valid_until)}</dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("form.quality")}>
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className={label}>{t("fields.germination_percentage")}</dt>
                <dd className={value}>
                  {lot.germination_percentage === null
                    ? unavailable
                    : t("percentageValue", {
                        value: lot.germination_percentage,
                      })}
                </dd>
              </div>
              <div>
                <dt className={label}>
                  {t("fields.physical_purity_percentage")}
                </dt>
                <dd className={value}>
                  {lot.physical_purity_percentage === null
                    ? unavailable
                    : t("percentageValue", {
                        value: lot.physical_purity_percentage,
                      })}
                </dd>
              </div>
              <div>
                <dt className={label}>
                  {t("fields.genetic_purity_percentage")}
                </dt>
                <dd className={value}>
                  {lot.genetic_purity_percentage === null
                    ? unavailable
                    : t("percentageValue", {
                        value: lot.genetic_purity_percentage,
                      })}
                </dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("form.certification")}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className={label}>{t("fields.certification_number")}</dt>
                <dd className={value}>
                  {lot.certification_number ?? unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.certification_body")}</dt>
                <dd className={value}>
                  {lot.certification_body ?? unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.verified_by")}</dt>
                <dd className={value}>
                  {lot.verifier
                    ? t("verifierName", {
                        first: lot.verifier.first_name,
                        last: lot.verifier.last_name,
                      })
                    : unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.verified_at")}</dt>
                <dd className={value}>
                  {lot.verified_at
                    ? formatter.dateTime(new Date(lot.verified_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      })
                    : unavailable}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className={label}>{t("fields.notes")}</dt>
                <dd className={`${value} whitespace-pre-wrap`}>
                  {lot.notes ?? unavailable}
                </dd>
              </div>
            </dl>
          </ComponentCard>
        </div>
        <aside className="space-y-5">
          <ComponentCard title={t("form.previewTitle")}>
            <ImagePreview
              src={lot.seed?.primary_image?.image_url}
              alt={
                lot.seed?.primary_image?.alt_text ??
                lot.seed?.name ??
                unavailable
              }
              width={104}
              height={104}
              className="size-24 rounded-lg object-cover"
            />
            <dl className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <dt className={label}>{t("fields.seed_id")}</dt>
                <dd className={value}>
                  {lot.seed?.name ?? t("recordId", { id: lot.seed_id })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.crop")}</dt>
                <dd className={value}>{lot.seed?.crop_name ?? unavailable}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.variety")}</dt>
                <dd className={value}>
                  {lot.seed?.crop_variety_name ?? unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.sku")}</dt>
                <dd className={value}>{lot.seed?.sku ?? unavailable}</dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("report.title")}>
            {lot.report_url ? (
              <Link
                href={`/admin/seed-lots/${lot.id}/report`}
                prefetch={false}
                download
                className="text-brand-500 text-sm hover:underline"
              >
                {t("report.download")}
              </Link>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("report.empty")}
              </p>
            )}
          </ComponentCard>
        </aside>
      </div>
      <Link
        href="/admin/seed-lots"
        className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
      >
        {t("back")}
      </Link>
    </div>
  );
}
