"use client";
import SeedTranslations from "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/Step2Translations";
import type { ActionResult } from "@/types/api";
import type {
  Fertilizer,
  FertilizerTranslation,
} from "@/types/admin/fertilizer";
export default function Step3Translations({
  fertilizer,
  busy,
  onDirty,
  onSave,
}: {
  fertilizer: Fertilizer;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (
    values: Record<string, FertilizerTranslation>,
  ) => Promise<ActionResult<Fertilizer>>;
}) {
  return (
    <SeedTranslations
      seed={fertilizer}
      busy={busy}
      onDirty={onDirty}
      onSave={onSave}
      instructionsField="usage_instructions"
      namespace="fertilizers"
      formId="fertilizer-step-3"
    />
  );
}
