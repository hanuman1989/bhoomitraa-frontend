"use client";
import { useTranslations } from "next-intl";
import type {
  TimelineActivity,
  TimelineCrop,
  TimelineSmartAction,
} from "@/types/account/cropTimeline";
import TimelineDialogShell from "./TimelineDialogShell";
import { IconTile } from "./CategoryIcon";

/** Smart Action placeholder: only its heading for now; the body stays empty. */
export default function SmartActionDialog({
  action,
  activity,
  crop,
  onClose,
}: {
  action: TimelineSmartAction;
  activity: TimelineActivity;
  crop: TimelineCrop;
  onClose: () => void;
}) {
  const t = useTranslations("farmerCropTimeline.smartActions");
  return (
    <TimelineDialogShell
      title={action.label}
      subtitle={t("dialogSubtitle", {
        activity: activity.title ?? "",
        crop: crop.name ?? "",
        farm: crop.farm ?? "",
      })}
      icon={
        <IconTile
          icon={action.icon}
          tone={action.tone}
          className="size-10 rounded-xl"
          iconClassName="size-5"
        />
      }
      onClose={onClose}
    />
  );
}
