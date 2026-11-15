"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "@/icons";
import AccountPanelResizeHandle from "./AccountPanelResizeHandle";

export default function AccountBottomPanel({
  height,
  maximum,
  collapsed,
  children,
  onResize,
  onToggle,
}: {
  height: number;
  maximum: number;
  collapsed: boolean;
  children: ReactNode;
  onResize: (height: number) => void;
  onToggle: () => void;
}) {
  const t = useTranslations("farmerDashboard.panel");
  return (
    <>
      <section
        role="region"
        aria-label={t("label")}
        hidden={collapsed}
        style={{ height: height || undefined }}
        className={`shadow-theme-xl absolute inset-x-0 bottom-0 z-30 max-h-full flex-col rounded-t-lg border border-gray-200 bg-white/95 backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900/95 ${collapsed ? "hidden" : "flex"}`}
        onWheel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <AccountPanelResizeHandle
          height={height}
          maximum={maximum}
          onResize={onResize}
        />
        <div
          id="account-panel-content"
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-9 pb-5 sm:px-7"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </section>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? t("open") : t("close")}
        aria-expanded={!collapsed}
        aria-controls="account-panel-content"
        style={{
          bottom: collapsed
            ? "env(safe-area-inset-bottom)"
            : Math.max(0, height - (height >= maximum - 1 ? 36 : 16)),
        }}
        className="border-success-300 text-success-700 shadow-theme-sm hover:bg-success-50 focus-visible:outline-success-600 dark:border-success-700 dark:text-success-400 absolute end-5 z-30 flex size-8 shrink-0 items-center justify-center rounded-full border bg-white p-0 leading-none focus-visible:outline-2 sm:end-7 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <ChevronDownIcon
          aria-hidden="true"
          className={`block size-4 shrink-0 ${collapsed ? "rotate-180" : ""}`}
        />
      </button>
    </>
  );
}
