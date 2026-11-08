"use client";
import SeedMediaSource from "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/Step3MediaSource";
import type { ActionResult } from "@/types/api";
import type {
  Fertilizer,
  FertilizerMediaPayload,
} from "@/types/admin/fertilizer";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
export default function Step4MediaSource({
  fertilizer,
  choices,
  selections,
  canReview,
  busy,
  onDirty,
  onSave,
}: {
  fertilizer: Fertilizer;
  choices: TimelineChoices;
  selections: TimelineSelections;
  canReview: boolean;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (
    values: FertilizerMediaPayload,
    uploads: FormData,
  ) => Promise<ActionResult<Fertilizer>>;
}) {
  return (
    <SeedMediaSource
      seed={fertilizer}
      choices={choices}
      selections={selections}
      canReview={canReview}
      busy={busy}
      onDirty={onDirty}
      onSave={onSave}
      namespace="fertilizers"
      formId="fertilizer-step-4"
      requireSourceWhenVerified={false}
    />
  );
}
