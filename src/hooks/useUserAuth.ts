"use client";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  resetUserAuth,
  setUserAuth,
  setUserAuthLoading,
} from "@/store/slices/userAuthSlice";
import type { FarmerUser } from "@/lib/userAuth/types";

export function useUser() {
  return useAppSelector((state) => state.webUser.user);
}
export function useUserAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.webUser);
  const setAuth = useCallback(
    (user: FarmerUser) => {
      dispatch(setUserAuth(user));
    },
    [dispatch],
  );
  const resetAuth = useCallback(() => {
    dispatch(resetUserAuth());
  }, [dispatch]);
  const setLoading = useCallback(
    (loading: boolean) => {
      dispatch(setUserAuthLoading(loading));
    },
    [dispatch],
  );
  return { ...auth, setAuth, resetAuth, setLoading };
}
