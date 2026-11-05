"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type {
  Region,
  RegionFormValues,
  RegionType,
} from "@/types/admin/region";
import ParentRegionSelect from "./ParentRegionSelect";

interface RegionInformationFieldsProps {
  form: UseFormReturn<RegionFormValues>;
  region?: Region;
}

const parentTypes: Record<RegionType, RegionType | null> = {
  country: null,
  state: "country",
  district: "state",
  subdistrict: "district",
  village: "subdistrict",
};

export default function RegionInformationFields({
  form,
  region,
}: RegionInformationFieldsProps) {
  const t = useTranslations("regions.form");
  const types = useTranslations("regions.types");
  const {
    register,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const type = useWatch({ control, name: "region_type" });
  const parentType = type ? parentTypes[type] : null;
  return (
    <ComponentCard
      title={t("informationTitle")}
      desc={t("informationDescription")}
    >
      <div className="grid items-start gap-6 md:grid-cols-2">
        <div>
          <FilterSelect
            {...register("region_type", {
              required: t("typeRequired"),
              onChange: () =>
                setValue("parent_id", "", {
                  shouldValidate: true,
                  shouldDirty: true,
                }),
            })}
            id="region-type"
            className="aria-invalid:border-error-500 dark:aria-invalid:border-error-500"
            label={t("typeLabel")}
            aria-required="true"
            aria-invalid={Boolean(errors.region_type)}
            aria-describedby={
              errors.region_type ? "region-type-error" : undefined
            }
          >
            <option value="">{t("selectType")}</option>
            <option value="country">{types("country")}</option>
            <option value="state">{types("state")}</option>
            <option value="district">{types("district")}</option>
            <option value="subdistrict">{types("subdistrict")}</option>
            <option value="village">{types("village")}</option>
          </FilterSelect>
          {errors.region_type && (
            <p
              id="region-type-error"
              role="alert"
              className="text-theme-xs text-error-600 dark:text-error-400 mt-1"
            >
              {errors.region_type.message}
            </p>
          )}
        </div>
        {parentType ? (
          <Controller
            name="parent_id"
            control={control}
            shouldUnregister
            rules={{
              validate: (value) => Boolean(value) || t("parentRequired"),
            }}
            render={({ field, fieldState }) => (
              <ParentRegionSelect
                key={type}
                type={parentType}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                initialParent={
                  region?.parent?.region_type === parentType
                    ? region.parent
                    : null
                }
                error={fieldState.error?.message}
                disabled={isSubmitting}
              />
            )}
          />
        ) : (
          <div>
            <FilterSelect
              id="region-parent"
              label={t("parent")}
              value=""
              disabled
            >
              <option value="">
                {type === "country" ? t("noParent") : t("selectTypeFirst")}
              </option>
            </FilterSelect>
            <p className="text-theme-xs mt-2 text-gray-500 dark:text-gray-400">
              {t("parentHint")}
            </p>
          </div>
        )}
        <div>
          <Label htmlFor="region-code">{t("code")}</Label>
          <Input
            {...register("code", {
              maxLength: { value: 50, message: t("codeMax") },
            })}
            id="region-code"
            maxLength={50}
            placeholder={t("codePlaceholder")}
            error={Boolean(errors.code)}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={
              errors.code ? "region-code-error" : "region-code-hint"
            }
          />
          {errors.code ? (
            <p
              id="region-code-error"
              role="alert"
              className="text-theme-xs text-error-600 dark:text-error-400 mt-1"
            >
              {errors.code.message}
            </p>
          ) : (
            <p
              id="region-code-hint"
              className="text-theme-xs mt-2 text-gray-500 dark:text-gray-400"
            >
              {t("codeHint")}
            </p>
          )}
        </div>
        <div>
          <FilterSelect
            {...register("is_active", { required: t("statusRequired") })}
            id="region-status"
            className="aria-invalid:border-error-500 dark:aria-invalid:border-error-500"
            label={t("statusLabel")}
            aria-required="true"
            aria-invalid={Boolean(errors.is_active)}
            aria-describedby={
              errors.is_active ? "region-status-error" : undefined
            }
          >
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </FilterSelect>
          {errors.is_active && (
            <p
              id="region-status-error"
              role="alert"
              className="text-theme-xs text-error-600 dark:text-error-400 mt-1"
            >
              {errors.is_active.message}
            </p>
          )}
        </div>
      </div>
    </ComponentCard>
  );
}
