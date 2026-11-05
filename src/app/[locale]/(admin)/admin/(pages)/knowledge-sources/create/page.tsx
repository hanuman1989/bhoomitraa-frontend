import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import KnowledgeSourcesHeader from "../_components/KnowledgeSourcesHeader";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import KnowledgeSourceEditor from "../_components/KnowledgeSourceEditor";

export const instant = false;

export default async function CreateKnowledgeSourcePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("knowledgeSources");
  return (
    <>
      <KnowledgeSourcesHeader
        title={t("createTitle")}
        description={t("formDescription")}
        breadcrumbs={[
          { label: t("home"), href: "/admin/dashboard" },
          { label: t("title"), href: "/admin/knowledge-sources" },
          { label: t("createTitle") },
        ]}
      />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <KnowledgeSourceEditor />
      </Suspense>
    </>
  );
}
