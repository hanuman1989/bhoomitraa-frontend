import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import KnowledgeSourcesHeader from "./_components/KnowledgeSourcesHeader";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import KnowledgeSourcesContent from "./_components/KnowledgeSourcesContent";

export const instant = false;

export default async function KnowledgeSourcesPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("knowledgeSources");
  return (
    <>
      <KnowledgeSourcesHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("home"), href: "/admin/dashboard" },
          { label: t("title") },
        ]}
      />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <KnowledgeSourcesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
