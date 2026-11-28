import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import FieldLayoutEditor from "../../_components/FieldLayoutEditor";

export const instant = false;

async function EditContent({ id, searchParams }: PageProps & { id: string }) {
  const { step } = await searchParams;
  return <FieldLayoutEditor id={id} requestedStep={step} />;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: PageProps["searchParams"];
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropFieldLayouts");
  return (
    <Suspense
      fallback={<SuspenseFallback variant="page" title={t("loading")} />}
    >
      <EditContent id={id} searchParams={searchParams} />
    </Suspense>
  );
}
