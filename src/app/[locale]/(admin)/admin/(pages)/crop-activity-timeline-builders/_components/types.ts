import type { ActionResult } from "@/types/api";
import type {
  ApplicabilityScope,
  CropActivityTemplate,
  CropActivityTemplatePayload,
  CropActivityTemplateListItem,
  TemplateScheduleType,
  TemplateSelectionOption,
  TemplateSmartAction,
} from "@/types/admin/cropActivityTemplate";
import type {
  RegionScope,
  StageTimelineListItem,
} from "@/types/admin/cropStageTimeline";

export interface BuilderStage {
  id: number;
  name: string | null;
  code: string;
  sequence: number;
}

export interface BuilderCategory {
  id: number;
  name: string | null;
  icon: string | null;
}

export interface BuilderOption {
  id: number;
  name: string | null;
  is_active: boolean;
}

export interface BuilderWorkspace {
  crop: { id: number; name: string | null; image_url: string | null };
  stages: BuilderStage[];
  varieties: BuilderOption[];
  seasons: BuilderOption[];
  timelines: StageTimelineListItem[];
  templates: CropActivityTemplateListItem[];
  categories: BuilderCategory[];
}

/** Variety/season/region/source applicability as backend IDs. */
export interface ApplicabilityValues {
  variety_scope: ApplicabilityScope;
  crop_variety_ids: number[];
  season_scope: ApplicabilityScope;
  season_ids: number[];
  region_scope: RegionScope;
  region_ids: number[];
  knowledge_source_ids: number[];
}

/** Common Configuration kept in admin-scoped localStorage, never in MySQL. */
export interface BuilderConfig {
  crop: TemplateSelectionOption;
  app: ApplicabilityValues;
}

export type ScheduleMode = "stage" | "fixed";

export interface ScheduleValues {
  mode: ScheduleMode;
  schedule_type: TemplateScheduleType;
  start: string;
  end: string;
}

export type TranslationValues = Record<
  string,
  { title: string; description: string; instructions: string }
>;

/** Signed day window relative to sowing (negative = before sowing). */
export interface DayWindow {
  min: number;
  max: number;
}

export type TimingCode =
  "valid" | "partial" | "outside" | "missing" | "afterHarvest";

export interface ActivityTiming {
  code: TimingCode;
  windows: DayWindow[];
  /** Sort key: earliest signed start; unresolved timing sorts last. */
  start: number;
}

export interface BuilderPrefs {
  searchVisible: boolean;
  filtersVisible: boolean;
  configVisible: boolean;
  view: "stage" | "chronological";
  groupByCategory: boolean;
  previewDate: string;
  showDates: boolean;
  /** Visible translation locales; hidden locales keep their saved content. */
  locales: string[];
}

export interface BuilderFilters {
  search: string;
  status:
    "all" | "incomplete" | "configured" | "active" | "inactive" | "exception";
  category: string;
  applicability: "all" | "matching" | "custom" | "session";
  schedule: "all" | TemplateScheduleType | "unresolved";
}

export type EditKind =
  | "basic"
  | "schedule"
  | "features"
  | "actions"
  | "translations"
  | "applicability"
  | "publication"
  | "duplicate"
  | "delete";

/** Saves one section of a loaded record through the existing update action. */
export type SaveSection = (
  record: CropActivityTemplate,
  patch: Partial<CropActivityTemplatePayload>,
  keepOpen?: boolean,
) => Promise<ActionResult<CropActivityTemplate>>;

export type DialogState =
  | { kind: "config" }
  | { kind: "create"; stageId: number | null; categoryId: number | null }
  | { kind: EditKind; id: number; record?: CropActivityTemplate }
  | { kind: "stage"; stageId: number }
  | { kind: "languages" }
  | { kind: "bulk" };

export const smartActionGroups: {
  name: string;
  actions: TemplateSmartAction[];
}[] = [
  {
    name: "crop",
    actions: [
      "crop_details",
      "crop_planning",
      "crop_completion",
      "field_layout_spacing",
      "sowing_planting_method",
    ],
  },
  {
    name: "inputs",
    actions: [
      "soil_assessment",
      "soil_test",
      "seed_calculator",
      "seed_record",
      "sowing_record",
      "choose_seed",
    ],
  },
  {
    name: "care",
    actions: [
      "fertilizer_recommendation",
      "fertilizer_record",
      "irrigation_recommendation",
      "irrigation_record",
      "water_management",
    ],
  },
  {
    name: "monitoring",
    actions: [
      "weather_forecast",
      "weather_alerts",
      "crop_observation",
      "growth_stage_tracking",
      "pest_monitoring",
      "disease_monitoring",
    ],
  },
  {
    name: "expert",
    actions: [
      "ai_crop_doctor",
      "ask_agricultural_expert",
      "knowledge_reference",
    ],
  },
  {
    name: "harvest",
    actions: [
      "yield_estimation",
      "actual_yield_record",
      "harvest_record",
      "produce_quality",
      "storage_record",
      "transport_record",
    ],
  },
  {
    name: "operations",
    actions: [
      "market_prices",
      "produce_sale",
      "income_estimation",
      "financial_summary",
      "expense_summary",
      "crop_profitability",
      "machinery_usage",
      "labour_assignment",
    ],
  },
];

/** Backend flag names with their existing cropActivityTemplates.features labels. */
export const featureFlags = [
  ["allow_status_update", "statusUpdate"],
  ["allow_expenses", "expenses"],
  ["allow_labour", "labour"],
  ["allow_notes", "notes"],
  ["allow_attachments", "attachments"],
  ["allow_rescheduling", "rescheduling"],
] as const;

export type FeatureFlag = (typeof featureFlags)[number][0];
