import { useTranslations } from "next-intl";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

export default function Loading() {
  const t = useTranslations("farmerSmartTimeline");
  return <SuspenseFallback variant="page" title={t("loading")} />;
}
