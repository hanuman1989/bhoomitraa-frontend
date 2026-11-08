import "server-only";

import type { ReactNode } from "react";

import { getCurrentAdmin } from "@/lib/auth/dal";
import Providers from "@/providers/Providers";

interface AdminAuthBoundaryProps {
  children: ReactNode;
}

export default async function UserAuthBoundary({
  children,
}: AdminAuthBoundaryProps) {
  const admin = await getCurrentAdmin();

  return <Providers initialAdminUser={admin}>{children}</Providers>;
}
