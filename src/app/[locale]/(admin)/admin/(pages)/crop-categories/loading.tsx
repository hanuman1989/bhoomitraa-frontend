import { useTranslations } from "next-intl";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

export default function Loading() {
  const t = useTranslations("cropCategories");
  return <SuspenseFallback variant="table" rows={8} title={t("loading")} />;
}
