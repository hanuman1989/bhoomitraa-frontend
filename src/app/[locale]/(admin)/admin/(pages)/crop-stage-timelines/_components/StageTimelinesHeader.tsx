import { useTranslations } from "next-intl";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import { CalenderIcon } from "@/icons";

export default function StageTimelinesHeader({
  mode = "list",
}: {
  mode?: "list" | "create" | "edit";
}) {
  const t = useTranslations("stageTimelines");
  const title = mode === "list" ? t("title") : t(`form.${mode}Title`);
  return (
    <div className="relative mb-6 ps-18 [&>header]:mb-0 [&>header]:flex-col [&>header]:gap-3">
      <span className="bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300 absolute start-0 top-1 flex size-14 items-center justify-center rounded-xl">
        <CalenderIcon aria-hidden="true" className="size-8" />
      </span>
      <PageBreadcrumb
        pageTitle={title}
        description={
          mode === "list" ? t("description") : t(`form.${mode}Description`)
        }
        breadcrumbs={[
          { label: t("dashboard"), href: "/admin/dashboard" },
          { label: t("cropManager"), href: "/admin/crops" },
          { label: t("growthStages"), href: "/admin/crop-stages" },
          ...(mode === "list"
            ? []
            : [
                { label: t("shortTitle"), href: "/admin/crop-stage-timelines" },
              ]),
          { label: title },
        ]}
      />
    </div>
  );
}
