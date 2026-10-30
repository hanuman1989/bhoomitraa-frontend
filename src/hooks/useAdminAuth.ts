"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAdminAuth, resetAdminAuth } from "@/store/slices/adminAuthSlice";
import type { AdminUser } from "@/types/admin/adminUser";

export function useAdminAuth() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.adminUser);

  const setAuth = useCallback(
    (adminUser: AdminUser) => dispatch(setAdminAuth(adminUser)),
    [dispatch],
  );
  const resetAuth = useCallback(() => dispatch(resetAdminAuth()), [dispatch]);

  return { user, isAuthenticated, setAuth, resetAuth };
}
