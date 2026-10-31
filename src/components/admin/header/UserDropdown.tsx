"use client";

import { useClickOutside } from "@/hooks/useClickOutside";
import { getLanguage, languages } from "@/i18n/languages";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ChevronDownIcon } from "@/icons";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { logoutAdmin } from "@/actions/admin/auth";

export default function UserDropdown() {
  const { user } = useAdminAuth();
  const { resetAuth } = useAdminAuth();
  const t = useTranslations("userDropdown");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const subDropdownRef = useRef<HTMLLIElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const currentLang = getLanguage(locale);
  const CurrentFlagIcon = currentLang.FlagIcon;

  useClickOutside(subDropdownRef, () => {
    setIsSubDropdownOpen(false);
  });

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsSubDropdownOpen(false);
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setIsSubDropdownOpen(false);
  };

  const handleSelectLanguage = (id: Locale) => {
    router.replace(pathname, { locale: id });
    setIsSubDropdownOpen(false);
  };

  async function handleLogout(): Promise<void> {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      // Revoke Laravel token and delete HttpOnly cookie.
      await logoutAdmin();

      // Clear authenticated admin details from Redux.
      resetAuth();

      // Navigate to public login page.
      router.replace("/admin/login");
      router.refresh();
    } catch {
      // Don't claim logout succeeded if local cookie clearing failed.
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400"
      >
        <span className="me-3 h-11 w-11 overflow-hidden rounded-full">
          <Image
            width={44}
            height={44}
            src="/images/logo/logo-icon.png"
            alt={t("user")}
          />
        </span>

        <span className="text-theme-sm me-1 block font-medium">
          {user?.first_name}
        </span>

        <ChevronDownIcon
          className={`size-5 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="shadow-theme-lg dark:bg-gray-dark absolute mt-4.25 flex w-65 flex-col rounded-2xl border border-gray-200 bg-white p-3 ltr:right-0 rtl:right-auto rtl:left-0 dark:border-gray-800"
      >
        <div>
          <span className="text-theme-sm block font-medium text-gray-700 dark:text-gray-400">
            {user?.full_name}
          </span>
          <span className="text-theme-xs mt-0.5 block text-gray-500 dark:text-gray-400">
            {user?.email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pt-4 pb-3 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/profile"
              className="group text-theme-sm flex items-center gap-3 rounded-lg px-3! py-2 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z"
                  fill=""
                />
              </svg>
              {t("editProfile")}
            </DropdownItem>
          </li>

          <li className="relative" ref={subDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSubDropdownOpen((prev) => !prev)}
              className={cn(
                "group text-theme-sm flex max-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 font-medium transition-colors",
                isSubDropdownOpen
                  ? "bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300",
              )}
            >
              <span className="text-theme-sm flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12.001 2.75C17.1091 2.75 21.2501 6.89178 21.2501 11.9999C21.2501 17.108 17.1091 21.2498 12.001 21.2498M12.001 2.75C6.89289 2.75 2.75195 6.89178 2.75195 11.9999C2.75195 17.108 6.8929 21.2498 12.001 21.2498M12.001 2.75C14.2097 2.75 16.0005 6.8914 16.0005 11.9993C16.0005 17.1073 14.2098 21.2498 12.001 21.2498M12.001 2.75C9.79226 2.75 8.00195 6.89141 8.00195 11.9994C8.00195 17.1073 9.79226 21.2498 12.001 21.2498M3.24561 8.99976H20.7544M3.24561 14.9998H20.7544"
                    stroke="#667085"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span>{t("language")}</span>
              </span>

              <span className="text-theme-xs flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 font-medium text-gray-700 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300">
                <span>{currentLang.shortName}</span>
                <CurrentFlagIcon className="size-3.5 shrink-0 overflow-hidden rounded-full" />
              </span>
            </button>

            {isSubDropdownOpen && (
              <div className="shadow-theme-lg dark:bg-gray-dark absolute top-11 w-62.5 rounded-2xl border border-gray-200 bg-white p-2 md:top-0 ltr:-left-2 ltr:md:right-[calc(100%+14px)] ltr:md:left-auto rtl:-right-2 rtl:md:right-auto rtl:md:left-[calc(100%+14px)] dark:border-gray-800">
                <ul className="flex flex-col gap-1">
                  {languages.map((language) => {
                    const isSelected = locale === language.id;
                    const FlagIcon = language.FlagIcon;

                    return (
                      <li key={language.id}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectLanguage(language.id);
                          }}
                          className={cn(
                            "text-theme-sm flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start font-medium transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
                            isSelected
                              ? "bg-brand-50 dark:bg-brand-500/15"
                              : "hover:bg-gray-100 dark:hover:bg-white/5",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full transition-opacity",
                                isSelected
                                  ? "bg-brand-500 dark:bg-brand-400 opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <FlagIcon className="size-5 shrink-0 overflow-hidden rounded-full" />
                            <span className="truncate">{language.name}</span>
                          </span>

                          {language.badge && (
                            <span className="bg-warning-50 text-theme-xs text-warning-600 dark:bg-warning-500/15 dark:text-warning-400 rounded px-1.5 py-0.5 font-semibold">
                              {language.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        </ul>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-busy={isLoggingOut}
          className="group text-theme-sm mt-3 flex items-center justify-center gap-3 rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          {isLoggingOut ? t("loggingOut") : t("signOut")}
        </button>
      </Dropdown>
    </div>
  );
}
