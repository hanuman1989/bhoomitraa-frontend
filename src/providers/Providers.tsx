"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "@/store/store";
import type { AdminUser } from "@/types/admin/adminUser";

interface ProvidersProps {
  children: ReactNode;
  initialAdminUser?: AdminUser | null;
}

export default function Providers({
  children,
  initialAdminUser = null,
}: ProvidersProps) {
  const [store] = useState<AppStore>(() =>
    makeStore({
      user: initialAdminUser,
      isAuthenticated: Boolean(initialAdminUser),
    }),
  );

  return <Provider store={store}>{children}</Provider>;
}
