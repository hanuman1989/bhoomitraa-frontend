import type { TemplatePriority } from "@/types/admin/cropActivityTemplate";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";

export interface TimelinePreviewInput {
  crop_id: number;
  crop_variety_id: number | null;
  season_id: number;
  sowing_date: string;
  district_id: number;
}

export interface TimelineGeneratorValues {
  crop_id: string;
  crop_variety_id: string;
  season_id: string;
  sowing_date: string;
  district_id: string;
}

type TimelineSource = Pick<
  KnowledgeSource,
  | "id"
  | "title"
  | "publisher"
  | "source_type"
  | "source_url"
  | "reference_identifier"
>;

interface TimelineWindow {
  start_day: number;
  end_day: number;
  start_date: string;
  end_date: string;
}

export interface TimelineGrowthStage extends TimelineWindow {
  crop_stage_id: number;
  stage_timeline_id: number;
  stage_timeline_ids: number[];
  name: string | null;
  sequence: number;
  is_estimated: true;
  source_id: number;
  source_ids: number[];
  source: TimelineSource;
}

export interface TimelineActivity extends TimelineWindow {
  template_id: number;
  title: string | null;
  description: string | null;
  instructions: string | null;
  category_id: number;
  category_name: string | null;
  crop_stage_id: number | null;
  crop_stage_name: string | null;
  schedule_type: "after_sowing";
  priority: TemplatePriority;
  source_id: number;
  source: TimelineSource;
  status: "planned";
}

export interface TimelinePreviewWarning {
  code: string;
  message: string;
  context: Record<string, unknown>;
}

export interface TimelinePreviewData {
  preview_only: true;
  input: TimelinePreviewInput;
  selection: {
    crop_name: string | null;
    crop_variety_name: string | null;
    season_name: string | null;
    district_name: string | null;
  };
  growth_stages: TimelineGrowthStage[];
  activities: TimelineActivity[];
  summary: {
    total_growth_stages: number;
    total_activities: number;
    first_date: string | null;
    last_date: string | null;
  };
  warnings: TimelinePreviewWarning[];
}
