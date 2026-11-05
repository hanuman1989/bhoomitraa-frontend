"use client";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type { Crop } from "@/types/admin/crop";
import type {
  CropVarietyFormValues,
  VarietyRelationPage,
} from "@/types/admin/cropVariety";
import VarietyRelationSelect from "./VarietyRelationSelect";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function CropVarietyBasicFields({
  form,
  cropOptions,
  initialCrop,
  formVersion,
  isSubmitting,
}: {
  form: UseFormReturn<CropVarietyFormValues>;
  cropOptions: VarietyRelationPage;
  initialCrop: Crop | null;
  formVersion: number;
  isSubmitting: boolean;
}) {
  const t = useTranslations("cropVarieties");
  const {
    register,
    control,
    getValues,
    formState: { errors },
  } = form;
  const integer = (value: string) =>
    value === "" ||
    (/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))) ||
    t("validation.integer");
  const range = () =>
    !getValues("maturity_days_min") ||
    !getValues("maturity_days_max") ||
    Number(getValues("maturity_days_min")) <=
      Number(getValues("maturity_days_max")) ||
    t("validation.range");
  return (
    <ComponentCard
      title={t("form.basic")}
      className="rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Controller
          name="crop_id"
          control={control}
          rules={{
            required: t("validation.crop"),
            validate: (value) =>
              (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
              t("validation.crop"),
          }}
          render={({ field }) => (
            <VarietyRelationSelect
              key={`crop-${formVersion}`}
              kind="crop"
              id="variety-crop"
              label={t("fields.crop")}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              initialPage={cropOptions}
              initialSelection={initialCrop}
              error={errors.crop_id?.message}
              required
              eligible
              disabled={isSubmitting}
            />
          )}
        />
        <div>
          <Label htmlFor="variety-slug">
            {t("fields.slug")}{" "}
            <span aria-hidden="true" className="text-error-600">
              *
            </span>
          </Label>
          <Input
            {...register("slug", {
              required: t("validation.required"),
              maxLength: {
                value: 255,
                message: t("validation.max", { count: 255 }),
              },
              pattern: {
                value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: t("validation.slug"),
              },
            })}
            id="variety-slug"
            aria-required="true"
            error={!!errors.slug}
            aria-invalid={!!errors.slug}
            aria-describedby="variety-slug-error"
            placeholder={t("form.slugPlaceholder")}
          />
          <p id="variety-slug-error" role="alert" className={errorClass}>
            {errors.slug?.message}
          </p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <Label htmlFor="variety-code">{t("fields.code")}</Label>
          <Input
            {...register("variety_code", {
              maxLength: {
                value: 50,
                message: t("validation.max", { count: 50 }),
              },
            })}
            id="variety-code"
            error={!!errors.variety_code}
            aria-invalid={!!errors.variety_code}
            aria-describedby="variety-code-error"
            placeholder={t("form.codePlaceholder")}
          />
          <p id="variety-code-error" role="alert" className={errorClass}>
            {errors.variety_code?.message}
          </p>
        </div>
        <div>
          <Label htmlFor="variety-min">{t("fields.minimum")}</Label>
          <Input
            {...register("maturity_days_min", {
              validate: { integer, range },
              deps: ["maturity_days_max"],
            })}
            id="variety-min"
            type="number"
            min={1}
            step={1}
            error={!!errors.maturity_days_min}
            aria-invalid={!!errors.maturity_days_min}
            aria-describedby="variety-min-error"
            placeholder={t("form.minimumPlaceholder")}
          />
          <p id="variety-min-error" role="alert" className={errorClass}>
            {errors.maturity_days_min?.message}
          </p>
        </div>
        <div>
          <Label htmlFor="variety-max">{t("fields.maximum")}</Label>
          <Input
            {...register("maturity_days_max", {
              validate: { integer, range },
              deps: ["maturity_days_min"],
            })}
            id="variety-max"
            type="number"
            min={1}
            step={1}
            error={!!errors.maturity_days_max}
            aria-invalid={!!errors.maturity_days_max}
            aria-describedby="variety-max-error"
            placeholder={t("form.maximumPlaceholder")}
          />
          <p id="variety-max-error" role="alert" className={errorClass}>
            {errors.maturity_days_max?.message}
          </p>
        </div>
      </div>
    </ComponentCard>
  );
}
