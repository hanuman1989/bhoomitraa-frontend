import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  AgricultureIcon,
  SproutIcon,
  DropletsIcon,
  TractorIcon,
  GroupIcon,
  UserIcon,
} from "@/icons";
import type { DashboardModule } from "../_components/dashboardTypes";

export type AccountNavigationId = "dashboard" | DashboardModule;
export type AccountDisplayMode = "map" | "panel" | "full-page";
interface AccountModule {
  href: string;
  titleKey: `modules.${AccountNavigationId}`;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  mode: AccountDisplayMode;
}
export const accountModules = {
  dashboard: {
    href: "/account/dashboard",
    titleKey: "modules.dashboard",
    icon: HomeIcon,
    mode: "panel",
  },
  "farm-manager": {
    href: "/account/farms",
    titleKey: "modules.farm-manager",
    icon: AgricultureIcon,
    mode: "panel",
  },
  "crop-manager": {
    href: "/account/crops",
    titleKey: "modules.crop-manager",
    icon: SproutIcon,
    mode: "panel",
  },
  irrigation: {
    href: "/account/irrigation",
    titleKey: "modules.irrigation",
    icon: DropletsIcon,
    mode: "panel",
  },
  machinery: {
    href: "/account/machinery",
    titleKey: "modules.machinery",
    icon: TractorIcon,
    mode: "panel",
  },
  employees: {
    href: "/account/employees",
    titleKey: "modules.employees",
    icon: GroupIcon,
    mode: "panel",
  },
  profile: {
    href: "/account/profile",
    titleKey: "modules.profile",
    icon: UserIcon,
    mode: "panel",
  },
} as const satisfies Record<AccountNavigationId, AccountModule>;

export const accountModuleEntries = Object.entries(accountModules) as [
  AccountNavigationId,
  AccountModule,
][];
/** Detail pages that belong to a module but live outside its URL prefix. */
const moduleChildRoutes: Partial<Record<AccountNavigationId, string[]>> = {
  "crop-manager": ["/account/crop-timeline"],
};
export function accountPathname(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}
export function resolveAccountRoute(pathname: string): {
  mode: AccountDisplayMode;
  activeModule: AccountNavigationId | null;
  titleKey: AccountModule["titleKey"] | null;
} {
  const path = accountPathname(pathname);
  const exact = accountModuleEntries.find(([, module]) => module.href === path);
  if (exact)
    return {
      mode: exact[1].mode,
      activeModule: exact[0],
      titleKey: exact[1].titleKey,
    };
  // Only list routes use the panel. Their future creation/detail children deliberately use a full-page workspace.
  const parent = accountModuleEntries.find(([id, module]) =>
    [module.href, ...(moduleChildRoutes[id] ?? [])].some((prefix) =>
      path.startsWith(`${prefix}/`),
    ),
  );
  return {
    mode: "full-page",
    activeModule: parent?.[0] ?? null,
    titleKey: parent?.[1].titleKey ?? null,
  };
}
