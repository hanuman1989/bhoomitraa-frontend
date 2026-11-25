"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  createFarmerCrop,
  saveCropSelection,
  saveCropBoundary,
  getFarmerCrop,
  getCropReview,
  finalizeFarmerCrop,
  deleteFarmerCrop,
  discardCropEdit,
} from "@/actions/account/farm-crops";
import type {
  BoundaryStepPayload,
  CropDetail,
  CropSaveResult,
  CropSelection,
  CropStepProps,
} from "@/types/account/farmCrop";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  CloseLineIcon,
  SproutIcon,
} from "@/icons";
import CropSelectionStep from "./CropSelectionStep";
import CropBoundaryStep from "./CropBoundaryStep";
import CropReviewStep from "./CropReviewStep";
import CropWizardStepper, { cropSteps } from "./CropWizardStepper";
import CropConfirmDialog from "./CropConfirmDialog";
import { CropNotice, cropButton, cropPrimary } from "./CropUi";

/** Review & Save is the last of the three wizard steps. */
const REVIEW_STEP = cropSteps.length;

export default function CropWizardDialog({
  id,
  farmId,
  startStep,
  onClose,
  onChanged,
  onSaved,
  onGenerateTimeline,
}: {
  id?: number;
  farmId?: number;
  startStep?: number;
  onClose: () => void;
  onChanged: () => void;
  onSaved: (crop: CropDetail) => void;
  /** Add mode only: called after a successful save to prepare and show the timeline. */
  onGenerateTimeline?: (id: number) => void;
}) {
  const t = useTranslations("farmerCrops");
  const [crop, setCrop] = useState<CropDetail | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [boundaryReady, setBoundaryReady] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState<
    "close" | "navigate" | "reload" | null
  >(null);
  const [target, setTarget] = useState(1);
  const [latest, setLatest] = useState<CropDetail | null>(null);
  const pending = useRef(false);
  const creation = useRef<{ payload: string; key: string } | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const markDirty = useCallback((value: boolean) => setDirty(value), []);
  // Add mode: a new crop or a draft being finished. Editing an active crop never touches its timeline.
  const addMode = crop?.status !== "active";
  useEffect(() => {
    if (!id) return;
    let active = true;
    startTransition(async () => {
      setLoading(true);
      setLoadError("");
      const result = await getFarmerCrop(id);
      if (!active) return;
      setLoading(false);
      if (result.success && result.data) {
        setCrop(result.data);
        setStep(startStep ?? result.data.next_step ?? 1);
      } else setLoadError(result.message);
    });
    return () => {
      active = false;
    };
  }, [id, startStep, attempt]);
  const cropId = crop?.id;
  useEffect(() => {
    if (step !== REVIEW_STEP || !cropId) return;
    let active = true;
    startTransition(async () => {
      setLoading(true);
      const result = await getCropReview(cropId);
      if (!active) return;
      setLoading(false);
      if (result.success && result.data) {
        setCrop(result.data);
        setLoadError("");
      } else setLoadError(result.message);
    });
    return () => {
      active = false;
    };
  }, [step, cropId, attempt]);
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [step]);
  async function saved(result: CropSaveResult, next: number) {
    if (result.success && result.data) {
      setCrop(result.data);
      setDirty(false);
      setStep(Math.min(next, result.data.next_step ?? REVIEW_STEP));
      onChanged();
    } else {
      toast.error(result.message);
      if (result.conflict && crop) {
        const current = await getFarmerCrop(crop.id);
        if (
          current.success &&
          current.data &&
          current.data.revision !== crop.revision
        )
          setLatest(current.data);
      }
    }
    return result;
  }
  const save: CropStepProps["onSave"] = async (number, values) => {
    if (pending.current) return { success: false, message: t("saving") };
    pending.current = true;
    setBusy(true);
    try {
      let result: CropSaveResult;
      if (number === 1) {
        const selection = values as CropSelection;
        if (!crop) {
          const payload = JSON.stringify(selection);
          if (creation.current?.payload !== payload)
            creation.current = { payload, key: crypto.randomUUID() };
          result = await createFarmerCrop(selection, creation.current.key);
        } else
          result = await saveCropSelection(crop.id, crop.revision, selection);
      } else if (!crop) return { success: false, message: t("saveFailed") };
      else {
        result = await saveCropBoundary(
          crop.id,
          crop.revision,
          values as BoundaryStepPayload,
        );
        if (result.success && result.data)
          toast.success(result.message || t("saved"));
      }
      return await saved(result, number + 1);
    } catch {
      const result = { success: false, message: t("saveFailed") };
      toast.error(result.message);
      return result;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  function close() {
    if (busy) return;
    if (crop || dirty) setConfirm("close");
    else onClose();
  }
  function navigate(next: number) {
    if (next === step) return;
    setTarget(next);
    if (dirty) setConfirm("navigate");
    else {
      setDirty(false);
      setStep(next);
    }
  }
  async function discard() {
    if (pending.current) return;
    if (!crop) {
      onClose();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const result =
        crop.status === "active"
          ? crop.has_pending_edit
            ? await discardCropEdit(crop.id, crop.revision)
            : { success: true, message: "" }
          : await deleteFarmerCrop(crop.id);
      if (result.success) {
        onChanged();
        onClose();
      } else toast.error(result.message);
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function finalize(revision: number): Promise<CropSaveResult> {
    if (!crop || pending.current)
      return { success: false, message: t("saving") };
    pending.current = true;
    setBusy(true);
    try {
      const generate = addMode;
      const result = await finalizeFarmerCrop(crop.id, revision);
      if (result.success && result.data) {
        toast.success(t("saved"));
        onChanged();
        onSaved(result.data);
        // The crop is saved first; a failed generation never undoes it.
        if (generate) onGenerateTimeline?.(result.data.id);
      } else {
        toast.error(result.message);
        if (result.conflict) {
          const current = await getFarmerCrop(crop.id);
          if (current.success && current.data) {
            if (current.data.revision !== crop.revision)
              setLatest(current.data);
            else {
              setCrop(current.data);
              setStep(2);
            }
          }
        } else if (result.errors) {
          const current = await getFarmerCrop(crop.id);
          if (current.success && current.data) {
            setCrop(current.data);
            setStep(current.data.next_step ?? REVIEW_STEP);
          }
        }
      }
      return result;
    } catch {
      toast.error(t("saveFailed"));
      return { success: false, message: t("saveFailed") };
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={close} className="relative z-9999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <DialogPanel
          className="shadow-theme-xl flex max-h-full w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white text-gray-950 dark:bg-gray-900 dark:text-white"
          aria-busy={busy}
        >
          <header className="flex shrink-0 items-start gap-3 px-5 py-3 sm:px-6">
            <SproutIcon className="text-success-700 dark:text-success-300 mt-0.5 size-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold">
                {t(id ? "editCrop" : "addCrop")}
              </DialogTitle>
              <Description className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {t(id ? "editWizardDescription" : "wizardDescription")}
              </Description>
            </div>
            <button
              type="button"
              disabled={busy}
              aria-label={t("close")}
              onClick={close}
              className="text-success-700 dark:text-success-300 rounded-lg p-2 focus-visible:outline-2"
            >
              <CloseLineIcon className="size-5" />
            </button>
          </header>
          <CropWizardStepper
            step={step}
            crop={crop}
            busy={busy || loading}
            onStep={navigate}
          />
          <div
            ref={body}
            className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain border-t border-gray-100 p-4 sm:p-5 dark:border-gray-800"
          >
            {latest && (
              <CropNotice error>
                {t("revisionConflict")}{" "}
                <button
                  type="button"
                  disabled={busy}
                  className="underline"
                  onClick={() => setConfirm("reload")}
                >
                  {t("reloadSaved")}
                </button>
              </CropNotice>
            )}
            {loadError && (
              <CropNotice error>
                {loadError}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  {t("retry")}
                </button>
              </CropNotice>
            )}
            {loading ? (
              <p role="status" className="py-20 text-center">
                {t("loading")}
              </p>
            ) : (
              !loadError && (
                <>
                  {step === 1 && (
                    <CropSelectionStep
                      key={`${crop?.id ?? "new"}-${crop?.revision ?? 0}-${step}`}
                      crop={crop}
                      farmId={farmId}
                      busy={busy}
                      onSave={save}
                      onDirty={markDirty}
                    />
                  )}{" "}
                  {crop && step === 2 && (
                    <CropBoundaryStep
                      onValidity={setBoundaryReady}
                      key={`${crop.id}-${crop.farm.id}-${crop.revision}-2`}
                      crop={crop}
                      busy={busy}
                      onSave={save}
                      onDirty={markDirty}
                    />
                  )}{" "}
                  {crop && step === REVIEW_STEP && (
                    <CropReviewStep
                      key={crop.revision}
                      crop={crop}
                      busy={busy}
                      onEdit={navigate}
                      onFinalize={finalize}
                    />
                  )}
                </>
              )
            )}
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-4 sm:px-6 dark:border-gray-700">
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => (step > 1 ? navigate(step - 1) : close())}
              className={cropButton}
            >
              <ChevronLeftIcon className="size-5 rtl:rotate-180" />
              {t(step > 1 ? "previous" : "cancel")}
            </button>
            <div className="flex flex-wrap justify-end gap-3">
              {step > 1 && (
                <button
                  type="button"
                  disabled={busy}
                  className={cropButton}
                  onClick={close}
                >
                  {t("cancel")}
                </button>
              )}
              <button
                type="submit"
                form="crop-step-form"
                disabled={
                  busy ||
                  loading ||
                  Boolean(loadError) ||
                  Boolean(latest) ||
                  (step === 2 && !boundaryReady) ||
                  (step === REVIEW_STEP && !crop?.can_finalize)
                }
                className={cropPrimary}
              >
                {busy
                  ? t("saving")
                  : step === REVIEW_STEP
                    ? t(addMode ? "saveCrop" : "updateCrop")
                    : t("nextStep", { step: t(`steps.${cropSteps[step]}`) })}
                <ArrowRightIcon className="size-5 rtl:rotate-180" />
              </button>
            </div>
          </footer>
        </DialogPanel>
      </div>
      {confirm === "close" && (
        <CropConfirmDialog
          title={t(crop ? "keepDraftTitle" : "unsavedTitle")}
          description={t(
            crop?.status === "active"
              ? "keepEditDescription"
              : crop
                ? "keepDraftDescription"
                : "unsavedDescription",
          )}
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={discard}
          confirmLabel={t(
            crop?.status === "active"
              ? "discardEdits"
              : crop
                ? "deleteDraft"
                : "discard",
          )}
          danger={crop?.status === "draft"}
          alternativeLabel={crop ? t("closeKeepDraft") : undefined}
          onAlternative={crop ? onClose : undefined}
          cancelLabel={t("continueEditing")}
        />
      )}
      {confirm === "navigate" && (
        <CropConfirmDialog
          title={t("unsavedTitle")}
          description={t("unsavedDescription")}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            setDirty(false);
            setStep(target);
            setConfirm(null);
          }}
          confirmLabel={t("discardAndContinue")}
        />
      )}
      {confirm === "reload" && (
        <CropConfirmDialog
          title={t("reloadSaved")}
          description={t("reloadDescription")}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (latest) {
              setCrop(latest);
              setStep(latest.next_step ?? 1);
              setDirty(false);
              setLatest(null);
            }
            setConfirm(null);
          }}
          confirmLabel={t("reloadSaved")}
        />
      )}
    </Dialog>
  );
}
