import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("knowledgeSources");
  return <SuspenseFallback variant="table" rows={8} title={t("loading")} />;
}
