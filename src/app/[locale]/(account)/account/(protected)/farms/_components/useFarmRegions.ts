"use client";
import { startTransition, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { getFarmRegions } from "@/actions/account/farms";
import type { FarmRegion, FarmRegionType } from "@/types/account/region";
export default function useFarmRegions(type: FarmRegionType, parent?: string) {
  const locale = useLocale();
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    items: FarmRegion[];
    error: boolean;
  }>({ key: "", items: [], error: false });
  const key = `${locale}:${type}:${parent ?? ""}:${attempt}`;
  useEffect(() => {
    if (type !== "state" && !parent) return;
    let active = true;
    startTransition(async () => {
      try {
        const response = await getFarmRegions(
          type,
          parent ? Number(parent) : undefined,
        );
        if (active)
          setResult({
            key,
            items: response.data ?? [],
            error: !response.success,
          });
      } catch {
        if (active) setResult({ key, items: [], error: true });
      }
    });
    return () => {
      active = false;
    };
  }, [key, type, parent]);
  const enabled = type === "state" || !!parent;
  return {
    items: result.key === key ? result.items : [],
    loading: enabled && result.key !== key,
    error: result.key === key && result.error,
    retry: () => retry((n) => n + 1),
  };
}
