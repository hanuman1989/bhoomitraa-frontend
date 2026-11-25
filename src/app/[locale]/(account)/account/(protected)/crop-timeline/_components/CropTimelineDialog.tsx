"use client";
import { useEffect, useState, startTransition } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useTranslations } from "next-intl";
import {
  generateCropTimeline,
  getCropTimeline,
} from "@/actions/account/farm-crop-timeline";
import type { CropTimelineData } from "@/types/account/cropTimeline";
import { CloseLineIcon } from "@/icons";
import { CropNotice } from "../../crops/_components/CropUi";
import CropTimeline from "./CropTimeline";
import CropTimelineSkeleton from "./CropTimelineSkeleton";
import TimelineGeneratingLoader from "./TimelineGeneratingLoader";

/**
 * Dialog shell (styled like the Add/Edit Crop wizard) around the shared
 * CropTimeline. With `generate`, it first prepares the timeline behind the
 * full-screen loader; a failure leaves the saved crop untouched and offers Retry.
 * Full screen on phones.
 */
export default function CropTimelineDialog({
  id,
  generate = false,
  onClose,
  onGenerated,
}: {
  id: number;
  generate?: boolean;
  onClose: () => void;
  onGenerated?: () => void;
}) {
  const t = useTranslations("farmerCropTimeline");
  const [timeline, setTimeline] = useState<CropTimelineData | null>(null);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(generate);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      setError("");
      setGenerating(generate);
      try {
        const result = generate
          ? await generateCropTimeline(id)
          : await getCropTimeline(id);
        if (!active) return;
        if (result.success && result.data) {
          setTimeline(result.data);
          if (generate) onGenerated?.();
        } else
          setError(
            result.message || t(generate ? "generateFailed" : "loadFailed"),
          );
      } catch {
        if (active) setError(t(generate ? "generateFailed" : "loadFailed"));
      } finally {
        if (active) setGenerating(false);
      }
    });
    return () => {
      active = false;
    };
    // onGenerated is a notification only; re-running for a new callback identity would regenerate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, generate, attempt, t]);
  return (
    <Dialog
      open
      onClose={() => {
        if (!generating) onClose();
      }}
      className="relative z-9999"
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center sm:p-4">
        <DialogPanel
          aria-labelledby={`crop-timeline-title-${id}`}
          aria-busy={generating}
          className="shadow-theme-xl flex h-full w-full max-w-7xl flex-col overflow-hidden bg-white text-gray-950 sm:h-auto sm:max-h-full sm:rounded-3xl dark:bg-gray-900 dark:text-white"
        >
          {timeline ? (
            <CropTimeline
              key={timeline.id}
              timeline={timeline}
              variant="dialog"
              onClose={onClose}
            />
          ) : (
            <div className="space-y-4 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id={`crop-timeline-title-${id}`}
                  className="text-xl font-bold"
                >
                  {t("title")}
                </h2>
                <button
                  type="button"
                  disabled={generating}
                  onClick={onClose}
                  aria-label={t("close")}
                  className="text-success-700 dark:text-success-300 focus-visible:outline-success-600 flex size-11 items-center justify-center rounded-lg focus-visible:outline-2"
                >
                  <CloseLineIcon aria-hidden="true" className="size-5" />
                </button>
              </div>
              {error ? (
                <CropNotice error>
                  {error}{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setAttempt((n) => n + 1)}
                  >
                    {t("retry")}
                  </button>
                </CropNotice>
              ) : (
                <CropTimelineSkeleton />
              )}
            </div>
          )}
        </DialogPanel>
      </div>
      {generating && <TimelineGeneratingLoader />}
    </Dialog>
  );
}
