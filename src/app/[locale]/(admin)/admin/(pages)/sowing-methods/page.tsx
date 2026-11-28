import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import MethodHeader from "./_components/MethodHeader";
import SowingMethodsContent from "./_components/SowingMethodsContent";

export const instant = false;

export default async function SowingMethodsPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sowingMethods");

  return (
    <>
      <MethodHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={10} title={t("loading")} />
        }
      >
        <SowingMethodsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
