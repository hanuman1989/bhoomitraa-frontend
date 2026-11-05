"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { Link } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type { Crop, CropFormValues } from "@/types/admin/crop";
import type { CropCategory } from "@/types/admin/cropCategory";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function CropBasicFields({
  form,
  categories,
  crop,
}: {
  form: UseFormReturn<CropFormValues>;
  categories: CropCategory[];
  crop: Crop | null;
}) {
  const t = useTranslations("crops");
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <Label htmlFor="crop-category">
          {t("fields.category")}{" "}
          <span aria-hidden="true" className="text-error-600">
            *
          </span>
        </Label>
        <select
          {...register("category_id", {
            required: t("validation.category"),
            validate: (value) =>
              categories.some((category) => category.id === Number(value)) ||
              t("validation.category"),
          })}
          id="crop-category"
          aria-required="true"
          aria-invalid={!!errors.category_id}
          aria-describedby="crop-category-help crop-category-error"
          className="shadow-theme-xs focus:border-brand-500 aria-invalid:border-error-500 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">{t("form.selectCategory")}</option>
          {crop &&
            !categories.some(
              (category) => category.id === crop.category_id,
            ) && (
              <option value={crop.category_id} disabled>
                {crop.category_name ??
                  t("categoryUnavailable", { id: crop.category_id })}
              </option>
            )}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.is_active
                ? (category.name ?? category.slug)
                : t("form.inactiveCategory", {
                    name: category.name ?? category.slug,
                  })}
            </option>
          ))}
        </select>
        <p
          id="crop-category-help"
          className="mt-2 text-xs text-gray-500 dark:text-gray-400"
        >
          {categories.some((category) => category.is_active) ? (
            t("form.categoryHelp")
          ) : (
            <>
              {t("form.noActiveCategories")}{" "}
              <Link
                href="/admin/crop-categories/create"
                className="text-brand-600 dark:text-brand-300 underline"
              >
                {t("form.addCategory")}
              </Link>
            </>
          )}
        </p>
        <p id="crop-category-error" role="alert" className={errorClass}>
          {errors.category_id?.message}
        </p>
      </div>
      <div>
        <Label htmlFor="crop-slug">
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
          id="crop-slug"
          aria-required="true"
          aria-invalid={!!errors.slug}
          aria-describedby="crop-slug-error"
          error={!!errors.slug}
          placeholder={t("form.slugPlaceholder")}
        />
        <p id="crop-slug-error" role="alert" className={errorClass}>
          {errors.slug?.message}
        </p>
      </div>
      <div>
        <Label htmlFor="crop-scientific-name">
          {t("fields.scientificName")}
        </Label>
        <Input
          {...register("scientific_name", {
            maxLength: {
              value: 255,
              message: t("validation.max", { count: 255 }),
            },
          })}
          id="crop-scientific-name"
          aria-invalid={!!errors.scientific_name}
          aria-describedby="crop-scientific-error"
          error={!!errors.scientific_name}
          placeholder={t("form.scientificPlaceholder")}
        />
        <p id="crop-scientific-error" role="alert" className={errorClass}>
          {errors.scientific_name?.message}
        </p>
      </div>
      <div>
        <Label htmlFor="crop-code">{t("fields.cropCode")}</Label>
        <Input
          {...register("crop_code", {
            maxLength: {
              value: 50,
              message: t("validation.max", { count: 50 }),
            },
          })}
          id="crop-code"
          aria-invalid={!!errors.crop_code}
          aria-describedby="crop-code-error"
          error={!!errors.crop_code}
          placeholder={t("form.codePlaceholder")}
        />
        <p id="crop-code-error" role="alert" className={errorClass}>
          {errors.crop_code?.message}
        </p>
      </div>
    </div>
  );
}
