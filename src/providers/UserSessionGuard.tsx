"use client";
import { useEffect, type ReactNode } from "react";
import { getAuthenticatedUser } from "@/actions/account/auth";
import { useUserAuth } from "@/hooks/useUserAuth";
import { useRouter } from "@/i18n/navigation";

/** The server boundary verifies the initial session. Recheck when returning to the tab. */
export default function UserSessionGuard({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { setAuth, resetAuth, setLoading } = useUserAuth();
  useEffect(() => {
    let active = true;
    let checking = false;
    async function checkSession() {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      setLoading(true);
      try {
        const result = await getAuthenticatedUser();
        if (!active || !result.success) return;
        if (result.data) setAuth(result.data);
        else {
          resetAuth();
          router.replace("/account/login");
          router.refresh();
        }
      } catch {
        /* A network interruption must not discard a verified session. */
      } finally {
        checking = false;
        if (active) setLoading(false);
      }
    }
    window.addEventListener("focus", checkSession);
    window.addEventListener("pageshow", checkSession);
    document.addEventListener("visibilitychange", checkSession);
    return () => {
      active = false;
      window.removeEventListener("focus", checkSession);
      window.removeEventListener("pageshow", checkSession);
      document.removeEventListener("visibilitychange", checkSession);
    };
  }, [router, setAuth, resetAuth, setLoading]);
  return children;
}
