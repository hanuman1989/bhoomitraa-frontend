import { getTranslations } from "next-intl/server";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";

export default async function MethodHeader({
  mode = "list",
}: {
  mode?: "list" | "create" | "edit" | "view";
}) {
  const t = await getTranslations("sowingMethods");
  const title = t(mode === "list" ? "title" : `${mode}Title`);
  return (
    <PageBreadcrumb
      pageTitle={title}
      description={t(mode === "list" ? "description" : `${mode}Description`)}
      breadcrumbs={[
        { label: t("home"), href: "/admin/dashboard" },
        { label: t("title"), href: "/admin/sowing-methods" },
        { label: mode === "list" ? t("methods") : title },
      ]}
    />
  );
}
