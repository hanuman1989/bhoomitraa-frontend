"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { useModal } from "@/hooks/useModal";
import {
  saveSeedBasic,
  saveSeedTranslations,
  saveSeedMedia,
  finalizeSeed,
} from "@/actions/admin/seeds";
import { ArrowRightIcon } from "@/icons";
import ProductWizardSteps from "@/components/admin/common/ProductWizardSteps";
import type { ActionResult, ApiValidationErrors } from "@/types/api";
import type { Seed, SeedStep } from "@/types/admin/seed";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import Step1BasicDetails from "./Step1BasicDetails";
import Step2Translations from "./Step2Translations";
import Step3MediaSource from "./Step3MediaSource";
import Step4ReviewSave from "./Step4ReviewSave";
import SeedConfirmDialog from "./SeedConfirmDialog";

export default function SeedForm({
  initialSeed,
  step,
  choices,
  selections,
  canReview,
  viewOnly,
}: {
  initialSeed: Seed | null;
  step: SeedStep;
  choices: TimelineChoices;
  selections: TimelineSelections;
  canReview: boolean;
  viewOnly: boolean;
}) {
  const t = useTranslations("seeds"),
    router = useRouter();
  const [seed, setSeed] = useState(initialSeed);
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
    operation: () => Promise<ActionResult<Seed>>,
    next?: SeedStep,
  ): Promise<ActionResult<Seed>> {
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
      setSeed(result.data);
      setDirty(false);
      toast.success(result.message || t("feedback.saved"));
      if (next) {
        const href = `/admin/seeds/${result.data.id}/step/${next}`;
        if (!initialSeed) router.replace(href);
        else router.push(href);
      } else router.push("/admin/seeds");
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
  const maximum = seed ? Math.min(4, seed.completed_step + 1) : 1;
  return (
    <div className="min-w-0 space-y-5">
      {!viewOnly && (
        <ProductWizardSteps
          steps={[1, 2, 3, 4] as const}
          step={step}
          completedStep={seed?.completed_step ?? 0}
          maximumStep={maximum}
          hasRecord={!!seed}
          busy={busy}
          label={t("wizard.stepsLabel")}
          stepLabel={(number) => t(`wizard.step${number}`)}
          onSelect={(number) =>
            seed && navigate(`/admin/seeds/${seed.id}/step/${number}`)
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
      {!viewOnly && seed && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t(
            seed.setup_status === "draft"
              ? "wizard.draftHelp"
              : "wizard.reverification",
          )}
        </p>
      )}
      {!viewOnly && step === 1 && (
        <Step1BasicDetails
          seed={seed}
          choices={choices}
          selections={selections}
          busy={busy}
          onDirty={setDirty}
          onSave={(values) =>
            save(() => saveSeedBasic(seed?.id ?? null, values), 2)
          }
        />
      )}
      {!viewOnly && step === 2 && seed && (
        <Step2Translations
          seed={seed}
          busy={busy}
          onDirty={setDirty}
          onSave={(values) =>
            save(() => saveSeedTranslations(seed.id, values), 3)
          }
        />
      )}
      {!viewOnly && step === 3 && seed && (
        <Step3MediaSource
          seed={seed}
          choices={choices}
          selections={selections}
          canReview={canReview}
          busy={busy}
          onDirty={setDirty}
          onSave={(values, uploads) =>
            save(() => saveSeedMedia(seed.id, values, uploads), 4)
          }
        />
      )}
      {(viewOnly || step === 4) && seed && (
        <Step4ReviewSave
          seed={seed}
          busy={busy}
          canReview={canReview}
          viewOnly={viewOnly}
          errors={serverErrors}
          onEdit={(number) =>
            navigate(`/admin/seeds/${seed.id}/step/${number}`)
          }
          onSave={() => save(() => finalizeSeed(seed.id))}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          {!viewOnly && step > 1 && seed && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                navigate(`/admin/seeds/${seed.id}/step/${step - 1}`)
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
            onClick={() => navigate("/admin/seeds")}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            {t(viewOnly ? "back" : "cancel")}
          </button>
          {!viewOnly && (
            <button
              type="submit"
              form={`seed-step-${step}`}
              disabled={
                busy ||
                (step === 4 &&
                  (!seed?.ready_to_finalize ||
                    (!canReview && seed.requested_is_active)))
              }
              className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t(busy ? "saving" : step === 4 ? "wizard.save" : "wizard.next")}
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
