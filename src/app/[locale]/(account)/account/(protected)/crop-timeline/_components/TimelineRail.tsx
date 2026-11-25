"use client";
import type {
  TimelineActivity,
  TimelineSection as Section,
} from "@/types/account/cropTimeline";
import TimelineSection from "./TimelineSection";
import ActivityCard from "./ActivityCard";

export interface VisibleSection {
  section: Section;
  activities: TimelineActivity[];
}

/** Growth-stages view: a vertical line with one marker per section. */
export default function TimelineRail({
  sections,
  isSectionOpen,
  onToggleSection,
}: {
  sections: VisibleSection[];
  isSectionOpen: (key: string) => boolean;
  onToggleSection: (key: string) => void;
}) {
  return (
    <div className="relative ps-11.5 sm:ps-21">
      <span
        aria-hidden="true"
        className="absolute start-4.5 top-7 bottom-5 w-0.75 rounded-full bg-gray-300 sm:start-9 sm:w-1 dark:bg-gray-700"
      />
      {sections.map(({ section, activities }) => (
        <TimelineSection
          key={section.key}
          section={section}
          open={isSectionOpen(section.key)}
          onToggle={() => onToggleSection(section.key)}
          visibleCount={activities.length}
        >
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </TimelineSection>
      ))}
    </div>
  );
}
