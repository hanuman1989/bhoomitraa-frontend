import {
  AgricultureIcon,
  CropCategoryIcon,
  LeafIcon,
  SeedIcon,
  TaskIcon,
  ListIcon,
  CalenderIcon,
  TimeIcon,
  KnowledgeSourcesIcon,
  TractorIcon,
  SproutIcon,
  DropletsIcon,
  FlaskConicalIcon,
  ShieldCheckIcon,
  ScanEyeIcon,
  ChartNoAxesColumnIncreasingIcon,
  BotIcon,
  UserRoundCheckIcon,
  HarvestingIcon,
  ClipboardListIcon,
} from "@/icons";

// Matches Laravel ActivityCategory::SUPPORTED_ICONS. Never resolve arbitrary SVGs.
export const activityCategoryIcons = {
  AgricultureIcon,
  CropCategoryIcon,
  LeafIcon,
  SeedIcon,
  TaskIcon,
  ListIcon,
  CalenderIcon,
  TimeIcon,
  KnowledgeSourcesIcon,
  TractorIcon,
  SproutIcon,
  DropletsIcon,
  FlaskConicalIcon,
  ShieldCheckIcon,
  ScanEyeIcon,
  ChartNoAxesColumnIncreasingIcon,
  BotIcon,
  UserRoundCheckIcon,
  HarvestingIcon,
  ClipboardListIcon,
};

export type ActivityCategoryIcon = keyof typeof activityCategoryIcons;

export function isActivityCategoryIcon(
  value: string,
): value is ActivityCategoryIcon {
  return Object.hasOwn(activityCategoryIcons, value);
}
