"use client";
import type { ReactNode } from "react";
import AccountDashboardShell from "./AccountDashboardShell";
import type { FarmDataState } from "./dashboardTypes";
export default function AccountDashboardClient({
  children,
  farmState,
}: {
  children: ReactNode;
  farmState?: FarmDataState;
}) {
  return (
    <AccountDashboardShell farmState={farmState}>
      {children}
    </AccountDashboardShell>
  );
}
