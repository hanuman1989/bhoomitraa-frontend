import { useTranslations } from "next-intl";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";

export default function FertilizerRecommendationHeader({
  mode = "list",
}: {
  mode?: "list" | "create" | "edit" | "view";
}) {
  const t = useTranslations("fertilizerRecommendations"),
    title = t(mode === "list" ? "title" : `form.${mode}Title`);
  return (
    <PageBreadcrumb
      pageTitle={title}
      description={t(
        mode === "list" ? "description" : `form.${mode}Description`,
      )}
      breadcrumbs={[
        { label: t("home"), href: "/admin/dashboard" },
        { label: t("yieldAdvisoryManager") },
        ...(mode === "list"
          ? []
          : [{ label: t("title"), href: "/admin/fertilizer-recommendations" }]),
        { label: title },
      ]}
    />
  );
}
