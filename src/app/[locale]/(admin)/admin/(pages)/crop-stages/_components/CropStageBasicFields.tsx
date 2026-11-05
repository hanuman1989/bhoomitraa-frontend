"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { InfoIcon } from "@/icons";
import type {
  CropStage,
  CropStageCropOption,
  CropStageFormValues,
} from "@/types/admin/cropStage";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function CropStageBasicFields({
  form,
  stage,
  crops,
}: {
  form: UseFormReturn<CropStageFormValues>;
  stage: CropStage | null;
  crops: CropStageCropOption[];
}) {
  const t = useTranslations("cropStages");
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <ComponentCard
      title={t("form.basic")}
      className="shadow-theme-xs rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="stage-crop">
            {t("form.parentCrop")}{" "}
            <span aria-hidden="true" className="text-error-600">
              *
            </span>
          </Label>
          {stage ? (
            <>
              <input type="hidden" {...register("crop_id")} />
              <Input
                id="stage-crop"
                value={
                  stage.crop_name ??
                  t("form.missingCrop", { id: stage.crop_id })
                }
                readOnly
                aria-invalid={!!errors.crop_id}
                aria-describedby="stage-crop-help stage-crop-error"
                error={!!errors.crop_id}
              />
              <p
                id="stage-crop-help"
                className="mt-2 text-xs text-gray-500 dark:text-gray-400"
              >
                {t("form.cropReadOnly")}
              </p>
            </>
          ) : (
            <select
              {...register("crop_id", {
                required: t("validation.crop"),
                validate: (value) =>
                  crops.some((crop) => String(crop.id) === value) ||
                  t("validation.crop"),
              })}
              id="stage-crop"
              aria-required="true"
              aria-invalid={!!errors.crop_id}
              aria-describedby="stage-crop-error"
              className="focus-visible:outline-brand-500 aria-invalid:border-error-500 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus-visible:outline-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">{t("form.selectCrop")}</option>
              {crops.map((crop) => (
                <option key={crop.id} value={String(crop.id)}>
                  {crop.name}
                </option>
              ))}
            </select>
          )}
          <p id="stage-crop-error" role="alert" className={errorClass}>
            {errors.crop_id?.message}
          </p>
          {!stage && !crops.length && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("form.noCrops")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="stage-code">
            {t("fields.code")}{" "}
            <span aria-hidden="true" className="text-error-600">
              *
            </span>
          </Label>
          <Input
            {...register("code", {
              required: t("validation.codeRequired"),
              maxLength: {
                value: 50,
                message: t("validation.max", { count: 50 }),
              },
              pattern: {
                value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: t("validation.codeFormat"),
              },
            })}
            id="stage-code"
            aria-required="true"
            aria-invalid={!!errors.code}
            aria-describedby="stage-code-error"
            error={!!errors.code}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("form.codePlaceholder")}
          />
          <p id="stage-code-error" role="alert" className={errorClass}>
            {errors.code?.message}
          </p>
        </div>
        <div>
          <Label htmlFor="stage-sequence">
            {t("fields.sequence")}{" "}
            <span aria-hidden="true" className="text-error-600">
              *
            </span>
          </Label>
          <Input
            {...register("sequence", {
              required: t("validation.sequence"),
              validate: (value) =>
                (Number.isSafeInteger(Number(value)) &&
                  Number(value) >= 1 &&
                  Number(value) <= 65535) ||
                t("validation.sequence"),
            })}
            id="stage-sequence"
            type="number"
            min={1}
            max={65535}
            step={1}
            aria-required="true"
            aria-invalid={!!errors.sequence}
            aria-describedby="stage-sequence-help stage-sequence-error"
            error={!!errors.sequence}
            placeholder={t("form.sequencePlaceholder")}
          />
          <p id="stage-sequence-error" role="alert" className={errorClass}>
            {errors.sequence?.message}
          </p>
        </div>
      </div>
      <p
        id="stage-sequence-help"
        className="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-start gap-3 rounded-lg p-3 text-sm"
      >
        <InfoIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {t("form.sequenceHelp")}
      </p>
    </ComponentCard>
  );
}
