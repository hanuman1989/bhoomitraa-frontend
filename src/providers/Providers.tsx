"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "@/store/store";
import type { AdminUser } from "@/types/admin/adminUser";
import type { FarmerUser } from "@/lib/userAuth/types";

interface ProvidersProps {
  children: ReactNode;
  initialAdminUser?: AdminUser | null;
  initialUser?: FarmerUser | null;
}

export default function Providers({
  children,
  initialAdminUser = null,
  initialUser = null,
}: ProvidersProps) {
  const [store] = useState<AppStore>(() =>
    makeStore(
      {
        user: initialAdminUser,
        isAuthenticated: Boolean(initialAdminUser),
      },
      {
        user: initialUser,
        isAuthenticated: Boolean(initialUser),
        isLoading: false,
      },
    ),
  );

  return <Provider store={store}>{children}</Provider>;
}
