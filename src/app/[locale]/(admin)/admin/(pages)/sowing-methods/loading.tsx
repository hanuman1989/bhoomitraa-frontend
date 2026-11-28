import { getTranslations } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

export default async function Loading() {
  const t = await getTranslations("sowingMethods");
  return <SuspenseFallback variant="page" title={t("loading")} />;
}
