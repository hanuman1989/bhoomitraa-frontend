"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type { RegionFormValues } from "@/types/admin/region";

interface RegionLocationFieldsProps {
  form: UseFormReturn<RegionFormValues>;
}

export default function RegionLocationFields({
  form,
}: RegionLocationFieldsProps) {
  const t = useTranslations("regions.form");
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <ComponentCard title={t("locationTitle")} desc={t("locationDescription")}>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="region-latitude">{t("latitude")}</Label>
          <Input
            {...register("latitude", {
              validate: (value) =>
                value === "" ||
                (/^-?\d+(\.\d{1,7})?$/.test(value) &&
                  Number(value) >= -90 &&
                  Number(value) <= 90) ||
                t("latitudeInvalid"),
            })}
            id="region-latitude"
            inputMode="decimal"
            placeholder={t("latitudePlaceholder")}
            error={Boolean(errors.latitude)}
            aria-invalid={Boolean(errors.latitude)}
            aria-describedby={
              errors.latitude ? "region-latitude-error" : "region-latitude-hint"
            }
          />
          {errors.latitude ? (
            <p
              id="region-latitude-error"
              role="alert"
              className="text-theme-xs text-error-600 dark:text-error-400 mt-1"
            >
              {errors.latitude.message}
            </p>
          ) : (
            <p
              id="region-latitude-hint"
              className="text-theme-xs mt-2 text-gray-500 dark:text-gray-400"
            >
              {t("latitudeHint")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="region-longitude">{t("longitude")}</Label>
          <Input
            {...register("longitude", {
              validate: (value) =>
                value === "" ||
                (/^-?\d+(\.\d{1,7})?$/.test(value) &&
                  Number(value) >= -180 &&
                  Number(value) <= 180) ||
                t("longitudeInvalid"),
            })}
            id="region-longitude"
            inputMode="decimal"
            placeholder={t("longitudePlaceholder")}
            error={Boolean(errors.longitude)}
            aria-invalid={Boolean(errors.longitude)}
            aria-describedby={
              errors.longitude
                ? "region-longitude-error"
                : "region-longitude-hint"
            }
          />
          {errors.longitude ? (
            <p
              id="region-longitude-error"
              role="alert"
              className="text-theme-xs text-error-600 dark:text-error-400 mt-1"
            >
              {errors.longitude.message}
            </p>
          ) : (
            <p
              id="region-longitude-hint"
              className="text-theme-xs mt-2 text-gray-500 dark:text-gray-400"
            >
              {t("longitudeHint")}
            </p>
          )}
        </div>
      </div>
    </ComponentCard>
  );
}
