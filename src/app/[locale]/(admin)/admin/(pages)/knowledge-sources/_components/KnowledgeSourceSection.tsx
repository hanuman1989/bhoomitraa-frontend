import type { ReactNode } from "react";
import ComponentCard from "@/components/admin/common/ComponentCard";
import {
  DocsIcon,
  CalenderIcon,
  InfoIcon,
  CheckCircleIcon,
  FileIcon,
} from "@/icons";

const icons = {
  basic: DocsIcon,
  publication: CalenderIcon,
  description: FileIcon,
  verification: CheckCircleIcon,
  attachments: FileIcon,
  summary: InfoIcon,
};

export default function KnowledgeSourceSection({
  title,
  desc,
  kind = "basic",
  children,
}: {
  title: string;
  desc?: string;
  kind?: keyof typeof icons;
  children: ReactNode;
}) {
  const Icon = icons[kind];
  const tone =
    kind === "description"
      ? "bg-theme-purple-500/10 text-theme-purple-500"
      : kind === "summary" || kind === "attachments"
        ? "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
        : "bg-success-50 text-success-600 dark:bg-success-950 dark:text-success-300";
  return (
    <div className="relative h-full min-w-0">
      <span
        className={`absolute start-4 top-4 flex size-10 items-center justify-center rounded-2xl ${tone}`}
      >
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <ComponentCard
        title={title}
        desc={desc}
        className="shadow-theme-xs h-full rounded-xl [&>div:first-child]:py-4 [&>div:first-child]:ps-17 [&>div:last-child]:border-t-0 [&>div:last-child]:pt-1"
      >
        {children}
      </ComponentCard>
    </div>
  );
}
