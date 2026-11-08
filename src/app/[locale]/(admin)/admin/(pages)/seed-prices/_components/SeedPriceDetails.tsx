import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import ImagePreview from "@/components/common/ImagePreview";
import type { SeedPrice } from "@/types/admin/seedPrice";
import SeedPriceRowActions from "./SeedPriceRowActions";

export default function SeedPriceDetails({
  price,
  canReview,
}: {
  price: SeedPrice;
  canReview: boolean;
}) {
  const t = useTranslations("seedPrices"),
    formatter = useFormatter(),
    locale = useLocale(),
    unavailable = t("notAvailable");
  const label = "text-xs text-gray-500 dark:text-gray-400",
    value =
      "mt-1 break-words text-sm font-medium text-gray-900 dark:text-gray-100";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("priceName", {
              id: price.id,
              name: price.seed?.name ?? t("recordId", { id: price.seed_id }),
            })}
          </h2>
          <Badge color={price.is_active ? "success" : "light"}>
            {t(price.is_active ? "active" : "inactive")}
          </Badge>
        </div>
        <SeedPriceRowActions price={price} canReview={canReview} detail />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <ComponentCard title={t("form.pricing")}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className={label}>{t("fields.seed_id")}</dt>
                <dd className={value}>
                  {price.seed?.name ?? t("recordId", { id: price.seed_id })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.package_price")}</dt>
                <dd className={value}>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: price.currency_code,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4,
                  }).format(price.package_price as Intl.StringNumericLiteral)}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.package_quantity")}</dt>
                <dd className={value}>{price.package_quantity}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.package_unit_code")}</dt>
                <dd className={value}>
                  {t(`units.${price.package_unit_code}`)}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.price_type")}</dt>
                <dd className={value}>{t(`types.${price.price_type}`)}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.currency_code")}</dt>
                <dd className={value}>{price.currency_code}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.seller_name")}</dt>
                <dd className={value}>{price.seller_name ?? unavailable}</dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("form.validity")}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className={label}>{t("fields.effective_from")}</dt>
                <dd className={value}>
                  {formatter.dateTime(
                    new Date(`${price.effective_from}T00:00:00Z`),
                    { dateStyle: "medium", timeZone: "UTC" },
                  )}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.effective_to")}</dt>
                <dd className={value}>
                  {price.effective_to
                    ? formatter.dateTime(
                        new Date(`${price.effective_to}T00:00:00Z`),
                        { dateStyle: "medium", timeZone: "UTC" },
                      )
                    : t("openEnded")}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.source_id")}</dt>
                <dd className={value}>{price.source_title ?? unavailable}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.last_verified_at")}</dt>
                <dd className={value}>
                  {price.last_verified_at
                    ? formatter.dateTime(new Date(price.last_verified_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      })
                    : unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.created_at")}</dt>
                <dd className={value}>{price.added_at ?? unavailable}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.updated_at")}</dt>
                <dd className={value}>
                  {price.updated_at
                    ? formatter.dateTime(new Date(price.updated_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      })
                    : unavailable}
                </dd>
              </div>
            </dl>
          </ComponentCard>
        </div>
        <aside className="space-y-5 xl:col-span-2">
          <ComponentCard title={t("form.regions")}>
            <Badge color={price.region_scope === "all" ? "info" : "warning"}>
              {t(`scopes.${price.region_scope}`)}
            </Badge>
            {price.region_scope === "specific" ? (
              <ul className="space-y-2">
                {price.regions.map((region) => (
                  <li
                    key={region.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span>
                      {region.name ?? t("districtId", { id: region.id })}
                    </span>
                    {!region.is_active && (
                      <Badge color="warning">{t("inactive")}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("form.allRegionsHelp")}
              </p>
            )}
          </ComponentCard>
          <ComponentCard title={t("form.previewTitle")}>
            <ImagePreview
              src={price.seed?.primary_image?.image_url}
              alt={
                price.seed?.primary_image?.alt_text ??
                price.seed?.name ??
                unavailable
              }
              width={96}
              height={96}
              className="size-24 rounded-lg object-cover"
            />
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className={label}>{t("fields.crop")}</dt>
                <dd className={value}>
                  {price.seed?.crop_name ?? unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.variety")}</dt>
                <dd className={value}>
                  {price.seed?.crop_variety_name ?? unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.sku")}</dt>
                <dd className={value}>{price.seed?.sku ?? unavailable}</dd>
              </div>
              {price.seed?.reference_pack_quantity &&
                price.seed.reference_pack_unit_code && (
                  <div>
                    <dt className={label}>{t("fields.referencePack")}</dt>
                    <dd className={value}>
                      {t("packageValue", {
                        quantity: price.seed.reference_pack_quantity,
                        unit: t(`units.${price.seed.reference_pack_unit_code}`),
                      })}
                    </dd>
                  </div>
                )}
            </dl>
          </ComponentCard>
        </aside>
      </div>
      <Link
        href="/admin/seed-prices"
        className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
      >
        {t("back")}
      </Link>
    </div>
  );
}
