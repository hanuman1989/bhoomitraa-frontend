/**
 * Farmer Crop Timeline contracts. Laravel returns every label display-ready in
 * the request locale; the frontend renders them without reformatting.
 */
export type TimelineTone = "green" | "amber" | "blue" | "red" | "violet";
export type TimelineSectionType =
  "before_sowing" | "growth_stage" | "after_harvest";
export type TimelineStageState = "past" | "current" | "future";
export type ActivityTimeState = "upcoming" | "due" | "late" | "done" | "passed";
export type ActivityStatus = "pending" | "in_progress" | "completed";
export type ActivityRecordType = "notes" | "expenses" | "labour" | "photos";
export type ActivityLastTileKey =
  "completed_on" | "time_left" | "window_ended" | "starts_in" | "window";

export interface TimelineCrop {
  name: string | null;
  other_name: string | null;
  image: string | null;
  variety: string | null;
  season: string | null;
  farm: string | null;
  area_label: string | null;
  location: string | null;
  sowing_date: string | null;
  sowing_date_label: string | null;
  expected_harvest_label: string | null;
  days: { label: string; value: string } | null;
}

export interface TimelineStats {
  growth_stages: number;
  activities: number;
  due_now: number;
  late: number;
  completed: number;
  total_tasks: number;
}

export interface TimelineCategory {
  id: number;
  name: string | null;
  icon: string;
  tone: TimelineTone;
}

export interface TimelineSmartAction {
  key: string;
  label: string;
  description: string;
  icon: string;
  tone: TimelineTone;
  used_at_label: string | null;
}

export interface TimelineNote {
  id: number;
  date: string;
  date_label: string;
  text: string;
}

export interface ActivityFlags {
  allow_status_update: boolean;
  allow_notes: boolean;
  allow_expenses: boolean;
  allow_labour: boolean;
  allow_attachments: boolean;
  allow_rescheduling: boolean;
}

export interface TimelineActivity {
  id: number;
  section_key: string;
  title: string | null;
  other_title: string | null;
  description: string | null;
  instructions: string | null;
  category: TimelineCategory | null;
  type: "information" | "observation" | "task";
  type_label: string;
  priority: "low" | "medium" | "high";
  priority_label: string;
  schedule_type: "before_sowing" | "after_sowing" | "after_harvesting";
  schedule_label: string;
  when_label: string;
  when_tone: "due" | "late" | null;
  time_state: ActivityTimeState;
  start_date: string;
  start_date_label: string;
  end_date: string;
  end_date_label: string;
  /** Calendar-list month group (YYYY-MM) and its display heading. */
  month_key: string;
  month_label: string;
  planned_start_date: string;
  planned_end_date: string;
  planned_range_label: string;
  is_rescheduled: boolean;
  last_tile: { key: ActivityLastTileKey; label: string; value: string };
  /** Null for information activities, which have no status. */
  status: ActivityStatus | null;
  status_label: string | null;
  status_line: string | null;
  started_at_label: string | null;
  completed_at_label: string | null;
  flags: ActivityFlags;
  records: Record<ActivityRecordType, number>;
  records_total: number;
  record_types_remaining: number;
  notes: TimelineNote[];
  smart_actions: TimelineSmartAction[];
  tools_remaining: number;
}

export interface TimelineStage {
  id: number;
  sequence: number | null;
  sequence_label: string | null;
  range_label: string | null;
  state: TimelineStageState;
}

export interface TimelineSection {
  key: string;
  type: TimelineSectionType;
  title: string | null;
  other_title: string | null;
  stage: TimelineStage | null;
  marker: { icon: string; icons: string[]; more: number };
  activity_count: number;
  done_count: number;
  total_count: number;
  activities: TimelineActivity[];
}

export interface CropTimelineData {
  id: number;
  status: "draft" | "active" | "completed" | "cancelled";
  generated: boolean;
  can_generate: boolean;
  editable: boolean;
  crop: TimelineCrop;
  alert: { show: boolean };
  stats: TimelineStats;
  current_stage_id: number | null;
  sections: TimelineSection[];
  /** Only on the generate response. */
  skipped?: number;
}

/** Every activity change returns the activity, refreshed totals and its section progress. */
export interface ActivityMutationData {
  activity: TimelineActivity;
  stats: TimelineStats;
  current_stage_id: number | null;
  section: { key: string; done_count: number; total_count: number };
}

export interface RescheduleInput {
  start_date?: string;
  end_date?: string;
  reset?: boolean;
}

export interface NoteInput {
  note: string;
  note_date: string;
}
