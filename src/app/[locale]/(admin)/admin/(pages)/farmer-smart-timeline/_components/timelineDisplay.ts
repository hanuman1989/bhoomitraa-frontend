import type {
  TimelineActivity,
  TimelineGrowthStage,
} from "@/types/admin/farmerSmartTimeline";

export type TimelineDisplayEvent =
  | {
      type: "stage";
      date: string;
      stage: TimelineGrowthStage;
      colorIndex: number;
    }
  | { type: "activity"; date: string; activity: TimelineActivity };

// ISO calendar dates sort chronologically. Stable sorting keeps the API's stage
// sequence and activity ordering for ties, with stage markers before activities.
export function buildTimelineDisplayEvents(
  stages: TimelineGrowthStage[],
  activities: TimelineActivity[],
): TimelineDisplayEvent[] {
  const events: TimelineDisplayEvent[] = [
    ...stages.map((stage, colorIndex): TimelineDisplayEvent => ({
      type: "stage",
      date: stage.start_date,
      stage,
      colorIndex,
    })),
    ...activities.map((activity): TimelineDisplayEvent => ({
      type: "activity",
      date: activity.start_date,
      activity,
    })),
  ];
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
