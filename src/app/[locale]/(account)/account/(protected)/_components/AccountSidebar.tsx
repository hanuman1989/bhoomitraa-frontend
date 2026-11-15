"use client";
import { useState, type Ref } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { logoutUser } from "@/actions/account/auth";
import { useUserAuth } from "@/hooks/useUserAuth";
import { useRouter } from "@/i18n/navigation";
import {
  UserIcon,
  LogoutIcon,
  ChevronLeftIcon,
  CloseLineIcon,
  FarmLandscapeIcon,
} from "@/icons";
import {
  accountModuleEntries,
  type AccountNavigationId,
} from "../_config/accountModules";

export default function AccountSidebar({
  open,
  activeModule,
  onClose,
  onNavigate,
  panelRef,
}: {
  open: boolean;
  activeModule: AccountNavigationId | null;
  onClose: () => void;
  onNavigate: (module: AccountNavigationId) => void;
  panelRef?: Ref<HTMLDivElement>;
}) {
  const t = useTranslations("farmerDashboard");
  const tAccount = useTranslations("account");
  const { user, resetAuth, isLoading } = useUserAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError("");
    try {
      const result = await logoutUser();
      resetAuth();
      if (result.success)
        toast.success(result.message || tAccount("feedback.loggedOut"));
      else toast.error(result.message || tAccount("feedback.logoutFailed"));
      router.replace("/account/login");
      router.refresh();
    } catch {
      setError(tAccount("feedback.logoutFailed"));
      toast.error(tAccount("feedback.logoutFailed"));
      setLoggingOut(false);
    }
  }
  const itemClass =
    "flex w-full items-center gap-4 rounded-xl px-4 py-3 text-start text-base font-medium transition-colors hover:bg-success-50 focus-visible:outline-2 focus-visible:outline-success-600 dark:hover:bg-success-900/30";
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loggingOut) onClose();
      }}
      className="relative z-999"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/20 transition-opacity duration-200 data-closed:opacity-0 lg:bg-transparent"
      />
      <DialogPanel
        ref={panelRef}
        transition
        className="shadow-theme-xl fixed inset-y-0 start-0 flex w-72 max-w-full flex-col bg-white/95 backdrop-blur-xl transition-transform duration-200 ltr:data-closed:-translate-x-full rtl:data-closed:translate-x-full dark:bg-gray-900/95"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <DialogTitle className="sr-only">{t("navigation")}</DialogTitle>
        <button
          type="button"
          onClick={onClose}
          disabled={loggingOut}
          aria-label={t("closeSidebar")}
          className="focus-visible:outline-success-600 absolute end-2 top-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline-2 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <CloseLineIcon aria-hidden="true" className="size-5" />
        </button>
        <div className="mx-5 flex items-center gap-3 border-b border-gray-200 pt-10 pb-6 dark:border-gray-700">
          <span className="bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300 flex size-14 shrink-0 items-center justify-center rounded-full">
            <UserIcon aria-hidden="true" className="size-8" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-gray-950 dark:text-white">
              {user ? `${user.first_name} ${user.last_name}` : t("account")}
            </p>
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-300">
              {user?.email || user?.mobile}
            </p>
          </div>
        </div>
        <nav
          aria-label={t("navigation")}
          className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5 text-gray-900 dark:text-gray-100"
        >
          {accountModuleEntries.map(([id, { icon: Icon, titleKey }]) => (
            <button
              key={id}
              type="button"
              disabled={loggingOut}
              onClick={() => onNavigate(id)}
              aria-current={activeModule === id ? "page" : undefined}
              className={`${itemClass} ${activeModule === id ? "bg-success-100 dark:bg-success-900/40 font-semibold" : ""}`}
            >
              <Icon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-6 shrink-0"
              />
              <span className="flex-1">{t(titleKey)}</span>
              {id !== "profile" && id !== "dashboard" && (
                <ChevronLeftIcon
                  aria-hidden="true"
                  className="size-4 ltr:rotate-180"
                />
              )}
            </button>
          ))}
          <div className="mx-2 my-4 border-t border-gray-200 dark:border-gray-700" />
          {error && (
            <p
              role="alert"
              className="text-error-600 dark:text-error-400 px-4 text-sm"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut || isLoading}
            className={`${itemClass} disabled:opacity-50`}
          >
            <LogoutIcon
              aria-hidden="true"
              className="text-success-700 dark:text-success-400 size-6 shrink-0"
            />
            <span>
              {loggingOut
                ? tAccount("dashboard.loggingOut")
                : tAccount("dashboard.logout")}
            </span>
          </button>
        </nav>
        <FarmLandscapeIcon
          aria-hidden="true"
          className="text-success-600 dark:text-success-800 h-auto w-full shrink-0"
        />
      </DialogPanel>
    </Dialog>
  );
}
