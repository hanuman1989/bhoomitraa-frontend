"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import ImageUpload from "@/components/admin/common/ImageUpload";
import { CheckLineIcon, InfoIcon } from "@/icons";
import { saveCrop } from "@/actions/admin/crops";
import type { Crop, CropFormValues } from "@/types/admin/crop";
import type { CropCategory } from "@/types/admin/cropCategory";
import CropBasicFields from "./CropBasicFields";
import CropTranslationFields from "./CropTranslationFields";
import CropPublicationSettings from "./CropPublicationSettings";
import CropConfirmDialog from "./CropConfirmDialog";

const emptyValues: CropFormValues = {
  image: [],
  category_id: "",
  slug: "",
  scientific_name: "",
  crop_code: "",
  is_active: false,
  ai_diagnosis_enabled: false,
  translations: Object.fromEntries(
    languages.map(({ id }) => [id, { name: "", description: "" }]),
  ),
};

export default function CropForm({
  crop: initialCrop,
  categories,
  canManageAI,
}: {
  crop: Crop | null;
  categories: CropCategory[];
  canManageAI: boolean;
}) {
  const t = useTranslations("crops");
  const router = useRouter();
  const saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [crop, setCrop] = useState(initialCrop);
  const [image, setImage] = useState<File | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [failure, setFailure] = useState("");
  const [removingImage, setRemovingImage] = useState(false);
  const [imageRemovalPending, setImageRemovalPending] = useState(false);
  const form = useForm<CropFormValues>({
    defaultValues: {
      image: [],
      category_id: initialCrop ? String(initialCrop.category_id) : "",
      slug: initialCrop?.slug ?? "",
      scientific_name: initialCrop?.scientific_name ?? "",
      crop_code: initialCrop?.crop_code ?? "",
      is_active: initialCrop?.is_active ?? false,
      ai_diagnosis_enabled: initialCrop?.ai_diagnosis_enabled ?? false,
      translations: Object.fromEntries(
        languages.map(({ id }) => [
          id,
          {
            name: initialCrop?.translations?.[id]?.name ?? "",
            description: initialCrop?.translations?.[id]?.description ?? "",
          },
        ]),
      ),
    },
    mode: "onTouched",
  });
  const {
    handleSubmit,
    register,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = form;

  function validateImage(files: File[]) {
    if (files.length > 1) return t("feedback.invalidImage");
    const selected = files[0];
    if (!selected) return true;
    return (
      (selected.size > 0 &&
        selected.size <= 5 * 1024 * 1024 &&
        /\.(jpe?g|png|webp)$/i.test(selected.name) &&
        ["image/jpeg", "image/png", "image/webp"].includes(selected.type)) ||
      t("feedback.invalidImage")
    );
  }

  function chooseImage(files: File[]) {
    if (saving.current || pending) return false;
    setValue("image", files, { shouldValidate: true, shouldDirty: true });
    if (validateImage(files) !== true) return false;
    setImage(files[0] ?? null);
    if (files[0]) setImageRemovalPending(false);
    return true;
  }

  function finishSave() {
    if (!initialCrop) {
      reset(emptyValues);
      setCrop(null);
      setFailure("");
    }
    setImage(null);
    setImageRemovalPending(false);
    setImageVersion((version) => version + 1);
    router.push("/admin/crops");
  }

  function submit(values: CropFormValues) {
    if (saving.current) return;
    saving.current = true;
    setFailure("");
    startTransition(async () => {
      try {
        const imageData = new FormData();
        if (image) imageData.append("image", image);
        const result = await saveCrop(
          crop?.id ?? null,
          {
            ...(imageRemovalPending && !image && { image: null }),
            category_id: Number(values.category_id),
            slug: values.slug.trim(),
            scientific_name: values.scientific_name.trim() || null,
            crop_code: values.crop_code.trim() || null,
            is_active: values.is_active,
            ...(canManageAI && {
              ai_diagnosis_enabled: values.ai_diagnosis_enabled,
            }),
            translations: Object.fromEntries(
              languages.map(({ id }) => [
                id,
                {
                  name: values.translations[id].name.trim(),
                  description:
                    values.translations[id].description.trim() || null,
                },
              ]),
            ),
          },
          imageData,
        );
        if (!result.success || !result.data) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            switch (field) {
              case "category_id":
              case "slug":
              case "scientific_name":
              case "crop_code":
              case "is_active":
              case "ai_diagnosis_enabled":
              case "image":
                setError(field, { type: "server", message: messages[0] });
                break;
              default:
                for (const { id } of languages) {
                  if (field === `translations.${id}.name`)
                    setError(`translations.${id}.name`, {
                      type: "server",
                      message: messages[0],
                    });
                  if (field === `translations.${id}.description`)
                    setError(`translations.${id}.description`, {
                      type: "server",
                      message: messages[0],
                    });
                }
            }
          }
          const message = result.message || t("feedback.saveFailed");
          setFailure(message);
          toast.error(message);
          return;
        }
        setCrop(result.data);
        reset({ ...values, image: [] });
        toast.success(result.message || t("feedback.saved"));
        finishSave();
      } catch {
        setFailure(t("feedback.saveFailed"));
        toast.error(t("feedback.saveFailed"));
      } finally {
        saving.current = false;
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
      noValidate
      aria-busy={pending}
      className="space-y-6"
    >
      {failure && (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-4 text-sm"
        >
          {failure}
        </p>
      )}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-3">
        <fieldset
          disabled={pending}
          className="min-w-0 disabled:opacity-70 xl:col-span-2"
        >
          <legend className="sr-only">{t("form.basicTitle")}</legend>
          <ComponentCard
            title={t("form.basicTitle")}
            className="shadow-theme-xs rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
          >
            <CropBasicFields
              form={form}
              categories={categories}
              crop={initialCrop}
            />
            <CropTranslationFields form={form} />
          </ComponentCard>
        </fieldset>
        <aside className="min-w-0 space-y-5">
          <ComponentCard
            title={t("image.title")}
            desc={t("image.help")}
            className="shadow-theme-xs rounded-xl"
          >
            <ImageUpload
              key={imageVersion}
              id="crop-image"
              label={t("image.title")}
              existingImageUrl={crop?.image_url}
              selectedFile={image}
              disabled={pending}
              maxSizeMB={5}
              error={errors.image?.message}
              inputProps={register("image", { validate: validateImage })}
              onChange={chooseImage}
              removalPending={imageRemovalPending}
              onRemoveExisting={() => setRemovingImage(true)}
              onUndoRemove={() => setImageRemovalPending(false)}
            />
            {removingImage && crop && (
              <CropConfirmDialog
                crop={crop}
                operation="removeImage"
                onClose={() => setRemovingImage(false)}
                onConfirm={() => {
                  setImageRemovalPending(true);
                  setValue("image", [], {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setImageVersion((version) => version + 1);
                }}
              />
            )}
          </ComponentCard>
          <fieldset disabled={pending} className="min-w-0">
            <CropPublicationSettings
              form={form}
              busy={pending}
              canManageAI={canManageAI}
              categories={categories}
            />
          </fieldset>
          <ComponentCard
            title={t("form.guidelinesTitle")}
            className="border-brand-100 bg-brand-50/70 dark:border-brand-900 dark:bg-brand-950/40 rounded-xl"
          >
            <div className="flex items-start gap-2">
              <InfoIcon
                aria-hidden="true"
                className="text-brand-500 mt-1 size-5 shrink-0"
              />
              <ul className="list-disc space-y-3 ps-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <li>{t("form.guidelineCategory")}</li>
                <li>{t("form.guidelineSlug")}</li>
                <li>{t("form.guidelineNames")}</li>
                <li>{t("form.guidelineOptional")}</li>
                <li>{t("form.guidelineImage")}</li>
                <li>{t("form.guidelinePublication")}</li>
                <li>{t("form.guidelineHistory")}</li>
              </ul>
            </div>
          </ComponentCard>
        </aside>
      </div>
      <div className="shadow-theme-xs sticky bottom-0 z-9 flex flex-wrap justify-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/admin/crops")}
          className="focus-visible:outline-brand-500 rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {t("form.cancel")}
        </button>
        <button
          disabled={pending}
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
        >
          <CheckLineIcon aria-hidden="true" className="size-5" />
          {pending
            ? t("form.saving")
            : initialCrop
              ? t("form.update")
              : t("form.save")}
        </button>
      </div>
    </form>
  );
}
