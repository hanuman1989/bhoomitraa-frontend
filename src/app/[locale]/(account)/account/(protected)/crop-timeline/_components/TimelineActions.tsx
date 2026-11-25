"use client";
import { createContext, useContext } from "react";
import type {
  ActivityRecordType,
  TimelineActivity,
  TimelineNote,
  TimelineSmartAction,
} from "@/types/account/cropTimeline";

/** UI actions shared by every activity card, provided once by CropTimeline. */
export interface TimelineActionsValue {
  editable: boolean;
  busyId: number | null;
  isOpen: (activityId: number) => boolean;
  toggle: (activityId: number) => void;
  /** Briefly true for the card that "Go to current" just scrolled to. */
  isHighlighted: (activityId: number) => boolean;
  isPanelOpen: (activityId: number, panel: "records" | "actions") => boolean;
  togglePanel: (activityId: number, panel: "records" | "actions") => void;
  complete: (activity: TimelineActivity) => void;
  askReopen: (activity: TimelineActivity) => void;
  addNote: (activity: TimelineActivity) => void;
  askDeleteNote: (activity: TimelineActivity, note: TimelineNote) => void;
  reschedule: (activity: TimelineActivity) => void;
  placeholder: (
    activity: TimelineActivity,
    type: Exclude<ActivityRecordType, "notes">,
  ) => void;
  smartAction: (
    activity: TimelineActivity,
    action: TimelineSmartAction,
  ) => void;
}

export const TimelineActionsContext =
  createContext<TimelineActionsValue | null>(null);

export function useTimelineActions(): TimelineActionsValue {
  const value = useContext(TimelineActionsContext);
  if (!value) throw new Error("Timeline actions require CropTimeline");
  return value;
}
