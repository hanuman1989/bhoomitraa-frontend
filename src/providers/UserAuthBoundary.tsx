import "server-only";

import type { ReactNode } from "react";

import { requireUser } from "@/lib/userAuth/dal";
import Providers from "@/providers/Providers";
import UserSessionGuard from "@/providers/UserSessionGuard";

interface UserAuthBoundaryProps {
  children: ReactNode;
}

export default async function UserAuthBoundary({
  children,
}: UserAuthBoundaryProps) {
  const user = await requireUser();

  return (
    <Providers initialUser={user}>
      <UserSessionGuard>{children}</UserSessionGuard>
    </Providers>
  );
}
