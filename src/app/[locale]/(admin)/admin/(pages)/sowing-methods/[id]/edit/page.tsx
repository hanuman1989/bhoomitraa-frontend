import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import MethodHeader from "../../_components/MethodHeader";
import MethodEditor from "../../_components/MethodEditor";

export const instant = false;

export default async function EditSowingMethodPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sowingMethods");

  return (
    <>
      <MethodHeader mode="edit" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <MethodEditor id={id} />
      </Suspense>
    </>
  );
}
