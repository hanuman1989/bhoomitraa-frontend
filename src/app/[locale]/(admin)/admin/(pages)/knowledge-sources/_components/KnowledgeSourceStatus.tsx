import { useTranslations } from "next-intl";
import Badge from "@/components/admin/ui/badge/Badge";
import type { VerificationStatus } from "@/types/admin/knowledgeSource";

export default function KnowledgeSourceStatus({
  status,
}: {
  status: VerificationStatus;
}) {
  const t = useTranslations("knowledgeSources.statuses");
  return (
    <Badge
      color={
        status === "verified"
          ? "success"
          : status === "pending"
            ? "warning"
            : "error"
      }
    >
      {t(status)}
    </Badge>
  );
}
