import { useTranslations } from "next-intl";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

export default function Loading() {
  const t = useTranslations("cropFieldLayouts");
  return <SuspenseFallback variant="table" rows={10} title={t("loading")} />;
}
