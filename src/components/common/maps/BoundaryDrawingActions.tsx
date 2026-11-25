"use client";
import {
  useId,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/common/Tooltip";
import {
  CheckLineIcon,
  FarmFieldIcon,
  InfoIcon,
  PencilIcon,
  ReopenIcon,
  TrashBinIcon,
} from "@/icons";
import type { FarmBoundarySession } from "@/hooks/useFarmBoundary";

export interface BoundaryDrawingAction {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  run: () => void;
  disabled?: boolean;
  /** Visible but blocked, so the tooltip can explain why. */
  blocked?: string;
}
const actionButton =
  "group focus-visible:outline-success-700 flex min-h-11 shrink-0 items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:min-h-0";
const actionIcon =
  "shadow-theme-lg flex size-11 shrink-0 items-center justify-center rounded-full sm:size-8";
const actionLabel =
  "shadow-theme-md rounded-xl px-2.5 py-1.5 text-xs font-medium max-sm:sr-only";

/** Floating map actions (dashboard FAB style) for manual boundary drawing. */
export default function BoundaryDrawingActions({
  phase,
  count,
  help,
  onDraw,
  onEdit,
  onUndo,
  onClear,
  onConfirm,
  extraActions = [],
}: {
  phase: FarmBoundarySession["phase"];
  count: number;
  /** "How to Draw" popover content; it opens on click only. */
  help: ReactNode;
  onDraw: () => void;
  onEdit: () => void;
  onUndo: () => void;
  onClear: () => void;
  onConfirm: () => void;
  /** Feature-specific actions shown first, e.g. the crop "Use Farm Boundary". */
  extraActions?: readonly BoundaryDrawingAction[];
}) {
  const t = useTranslations("farmerFarms");
  const tb = useTranslations("farmerDashboard.boundaryDraw");
  const reasonId = useId();
  const drawing = phase === "drawing";
  const actions: BoundaryDrawingAction[] = [...extraActions];
  if (phase === "idle")
    actions.push({
      id: "draw",
      label: t("drawPolygon"),
      icon: FarmFieldIcon,
      color: "bg-success-700 text-white",
      run: onDraw,
    });
  if (phase === "confirmed")
    actions.push(
      {
        id: "edit",
        label: t("editBoundary"),
        icon: PencilIcon,
        color: "bg-blue-light-500 text-white",
        run: onEdit,
      },
      {
        id: "redraw",
        label: t("redrawBoundary"),
        icon: FarmFieldIcon,
        color: "bg-success-600 text-white",
        run: onDraw,
      },
    );
  if (drawing)
    actions.push({
      id: "undo",
      label: t("wizard.undoPoint"),
      icon: ReopenIcon,
      color: "bg-gray-600 text-white",
      run: onUndo,
      disabled: count === 0,
    });
  if (phase !== "idle")
    actions.push({
      id: "clear",
      label: t("wizard.clearBoundary"),
      icon: TrashBinIcon,
      color: "bg-error-600 text-white",
      run: onClear,
      disabled: count === 0,
    });
  if (drawing || phase === "editing")
    actions.push({
      id: "confirm",
      label: t("confirmBoundary"),
      icon: CheckLineIcon,
      color: "bg-success-700 text-white",
      run: onConfirm,
      blocked: count < 3 ? tb("minPoints") : undefined,
    });
  return (
    <div
      role="toolbar"
      aria-label={t("drawingTools")}
      aria-orientation="vertical"
      className="absolute start-3 top-14 flex flex-col items-start gap-1.5"
    >
      {/* Labels are visible beside the icons, so tooltips only explain blocked actions. */}
      {actions.map(
        ({ id, label, icon: Icon, color, run, disabled, blocked }) => (
          <Tooltip
            key={id}
            content={blocked}
            id={`${reasonId}-${id}`}
            side="end"
            className="shrink-0"
          >
            <button
              type="button"
              disabled={disabled}
              aria-disabled={blocked ? true : undefined}
              aria-label={label}
              aria-describedby={blocked ? `${reasonId}-${id}` : undefined}
              onClick={() => {
                if (!blocked) run();
              }}
              className={actionButton}
            >
              <span className={`${actionIcon} ${color}`}>
                <Icon aria-hidden="true" className="block size-4 shrink-0" />
              </span>
              <span
                className={`${actionLabel} group-hover:bg-success-50 bg-white/95 text-gray-950 dark:bg-gray-900 dark:text-gray-100 dark:group-hover:bg-gray-800`}
              >
                {label}
              </span>
            </button>
          </Tooltip>
        ),
      )}
      <Popover>
        <PopoverButton
          type="button"
          aria-label={t("howToDraw")}
          className={actionButton}
        >
          <span
            className={`${actionIcon} text-success-700 ring-success-600 group-data-open:bg-success-700 dark:text-success-300 bg-white ring-1 group-data-open:text-white dark:bg-gray-800`}
          >
            <InfoIcon aria-hidden="true" className="block size-4 shrink-0" />
          </span>
          <span
            className={`${actionLabel} group-hover:bg-success-50 group-data-open:bg-success-50 group-data-open:text-success-800 dark:group-data-open:bg-success-950 dark:group-data-open:text-success-200 bg-white/95 text-gray-950 dark:bg-gray-900 dark:text-gray-100 dark:group-hover:bg-gray-800`}
          >
            {t("howToDraw")}
          </span>
        </PopoverButton>
        <PopoverPanel
          anchor={{ to: "bottom start", gap: 8, padding: 12 }}
          className="shadow-theme-xl z-999999 w-72 rounded-2xl border border-gray-200 bg-white p-4 focus:outline-none sm:w-80 dark:border-gray-700 dark:bg-gray-900"
        >
          {help}
        </PopoverPanel>
      </Popover>
    </div>
  );
}
