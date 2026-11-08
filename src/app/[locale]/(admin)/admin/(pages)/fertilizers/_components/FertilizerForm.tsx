"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { useModal } from "@/hooks/useModal";
import {
  saveFertilizerBasic,
  saveFertilizerNutrients,
  saveFertilizerTranslations,
  saveFertilizerMedia,
  finalizeFertilizer,
} from "@/actions/admin/fertilizers";
import { ArrowRightIcon } from "@/icons";
import ProductWizardSteps from "@/components/admin/common/ProductWizardSteps";
import type { ActionResult, ApiValidationErrors } from "@/types/api";
import type { Fertilizer, FertilizerStep } from "@/types/admin/fertilizer";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import Step1BasicDetails from "./Step1BasicDetails";
import Step2NutrientComposition from "./Step2NutrientComposition";
import Step3Translations from "./Step3Translations";
import Step4MediaSource from "./Step4MediaSource";
import Step5ReviewSave from "./Step5ReviewSave";
import SeedConfirmDialog from "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog";

export default function FertilizerForm({
  initialFertilizer,
  step,
  choices,
  selections,
  canReview,
  viewOnly,
}: {
  initialFertilizer: Fertilizer | null;
  step: FertilizerStep;
  choices: TimelineChoices;
  selections: TimelineSelections;
  canReview: boolean;
  viewOnly: boolean;
}) {
  const t = useTranslations("fertilizers"),
    router = useRouter();
  const [fertilizer, setFertilizer] = useState(initialFertilizer);
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [failure, setFailure] = useState("");
  const [serverErrors, setServerErrors] = useState<ApiValidationErrors>({});
  const saving = useRef(false),
    target = useRef("");
  const { isOpen, openModal, closeModal } = useModal();
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function navigate(href: string) {
    if (saving.current) return;
    if (dirty) {
      target.current = href;
      openModal();
    } else router.push(href);
  }
  async function save(
    operation: () => Promise<ActionResult<Fertilizer>>,
    next?: FertilizerStep,
  ): Promise<ActionResult<Fertilizer>> {
    if (saving.current) return { success: false, message: t("saving") };
    saving.current = true;
    setBusy(true);
    setFailure("");
    setServerErrors({});
    try {
      const result = await operation();
      if (!result.success || !result.data) {
        const message = result.message || t("feedback.failed");
        setFailure(message);
        setServerErrors(result.errors ?? {});
        toast.error(message);
        return result;
      }
      setFertilizer(result.data);
      setDirty(false);
      toast.success(result.message || t("feedback.saved"));
      if (next) {
        const href = `/admin/fertilizers/${result.data.id}/step/${next}`;
        if (!initialFertilizer) router.replace(href);
        else router.push(href);
      } else router.push("/admin/fertilizers");
      return result;
    } catch {
      const message = t("feedback.failed");
      setFailure(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const maximum = fertilizer ? Math.min(5, fertilizer.completed_step + 1) : 1;
  return (
    <div className="min-w-0 space-y-5">
      {!viewOnly && (
        <ProductWizardSteps
          steps={[1, 2, 3, 4, 5] as const}
          step={step}
          completedStep={fertilizer?.completed_step ?? 0}
          maximumStep={maximum}
          hasRecord={!!fertilizer}
          busy={busy}
          label={t("wizard.stepsLabel")}
          stepLabel={(number) => t(`wizard.step${number}`)}
          onSelect={(number) =>
            fertilizer &&
            navigate(`/admin/fertilizers/${fertilizer.id}/step/${number}`)
          }
        />
      )}
      {failure && (
        <p
          role="alert"
          className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-lg p-4 text-sm"
        >
          {failure}
        </p>
      )}
      {!viewOnly && fertilizer && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t(
            fertilizer.setup_status === "draft"
              ? "wizard.draftHelp"
              : "wizard.reverification",
          )}
        </p>
      )}
      {!viewOnly && step === 1 && (
        <Step1BasicDetails
          fertilizer={fertilizer}
          busy={busy}
          onDirty={setDirty}
          onSave={(values) =>
            save(() => saveFertilizerBasic(fertilizer?.id ?? null, values), 2)
          }
        />
      )}
      {!viewOnly && step === 2 && fertilizer && (
        <Step2NutrientComposition
          fertilizer={fertilizer}
          busy={busy}
          onDirty={setDirty}
          onSave={(values) =>
            save(() => saveFertilizerNutrients(fertilizer.id, values), 3)
          }
        />
      )}
      {!viewOnly && step === 3 && fertilizer && (
        <Step3Translations
          fertilizer={fertilizer}
          busy={busy}
          onDirty={setDirty}
          onSave={(values) =>
            save(() => saveFertilizerTranslations(fertilizer.id, values), 4)
          }
        />
      )}
      {!viewOnly && step === 4 && fertilizer && (
        <Step4MediaSource
          fertilizer={fertilizer}
          choices={choices}
          selections={selections}
          canReview={canReview}
          busy={busy}
          onDirty={setDirty}
          onSave={(values, uploads) =>
            save(() => saveFertilizerMedia(fertilizer.id, values, uploads), 5)
          }
        />
      )}
      {(viewOnly || step === 5) && fertilizer && (
        <Step5ReviewSave
          fertilizer={fertilizer}
          busy={busy}
          canReview={canReview}
          viewOnly={viewOnly}
          errors={serverErrors}
          onEdit={(number) =>
            navigate(`/admin/fertilizers/${fertilizer.id}/step/${number}`)
          }
          onSave={() => save(() => finalizeFertilizer(fertilizer.id))}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          {!viewOnly && step > 1 && fertilizer && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                navigate(`/admin/fertilizers/${fertilizer.id}/step/${step - 1}`)
              }
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
            >
              {t("wizard.previous")}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => navigate("/admin/fertilizers")}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            {t(viewOnly ? "back" : "cancel")}
          </button>
          {!viewOnly && (
            <button
              type="submit"
              form={`fertilizer-step-${step}`}
              disabled={
                busy ||
                (step === 5 &&
                  (!fertilizer?.ready_to_finalize ||
                    (!canReview && fertilizer.requested_is_active)))
              }
              className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t(busy ? "saving" : step === 5 ? "wizard.save" : "wizard.next")}
              <ArrowRightIcon
                aria-hidden="true"
                className="size-4 rtl:rotate-180"
              />
            </button>
          )}
        </div>
      </div>
      {isOpen && (
        <SeedConfirmDialog
          title={t("confirm.leaveTitle")}
          description={t("confirm.leave")}
          confirmLabel={t("confirm.leaveAction")}
          onClose={closeModal}
          onConfirm={() => {
            setDirty(false);
            closeModal();
            router.push(target.current);
          }}
        />
      )}
    </div>
  );
}
