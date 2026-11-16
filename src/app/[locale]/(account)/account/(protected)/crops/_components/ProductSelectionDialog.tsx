"use client";
import { useEffect, useState, startTransition } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { getCropCatalog, getCropOptions } from "@/actions/account/farm-crops";
import type { ApiParams, PaginatedResponse } from "@/types/api";
import type { CropCatalog, CropCategory } from "@/types/account/farmCrop";
import { CloseLineIcon, SearchIcon } from "@/icons";
import {
  CropChoice,
  CropImage,
  CropNotice,
  cropButton,
  cropControl,
  cropPrimary,
} from "./CropUi";

const CATALOG_PAGE_SIZE = 12;

export default function ProductSelectionDialog<
  K extends "crops" | "seeds" | "fertilizers",
>({
  kind,
  initial,
  filters = {},
  multiple = false,
  compatibleVarietyId,
  onClose,
  onConfirm,
}: {
  kind: K;
  initial: CropCatalog[K][];
  filters?: ApiParams;
  multiple?: boolean;
  compatibleVarietyId?: number | null;
  onClose: () => void;
  onConfirm: (records: CropCatalog[K][]) => void;
}) {
  const t = useTranslations("farmerCrops");
  const title =
    kind === "crops"
      ? t("select.crops")
      : kind === "seeds"
        ? t("select.seeds")
        : t("select.fertilizers");
  const [selected, setSelected] = useState(initial);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<CropCategory[]>([]);
  const [data, setData] = useState<PaginatedResponse<CropCatalog[K]> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    if (kind !== "crops") return;
    let active = true;
    void getCropOptions("categories").then((result) => {
      if (active && result.success && result.data) setCategories(result.data);
    });
    return () => {
      active = false;
    };
  }, [kind]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(
      () =>
        startTransition(async () => {
          setLoading(true);
          setError("");
          const result = await getCropCatalog(kind, {
            ...JSON.parse(filterKey),
            search,
            page,
            per_page: CATALOG_PAGE_SIZE,
            ...(kind === "crops" && category
              ? { category_id: Number(category) }
              : {}),
            ...(kind === "fertilizers" && category
              ? { fertilizer_type: category }
              : {}),
          });
          if (!active) return;
          setLoading(false);
          if (result.success && result.data) setData(result.data);
          else setError(result.message);
        }),
      250,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [kind, filterKey, search, category, page, attempt]);
  return (
    <Dialog open onClose={onClose} className="relative z-99999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <DialogPanel className="shadow-theme-xl flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white text-gray-950 dark:bg-gray-900 dark:text-white">
          <header className="flex items-start gap-4 p-5 sm:p-6">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
              <Description className="mt-1 text-sm text-gray-500">
                {t("selectDescription")}
              </Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="rounded-lg p-2"
            >
              <CloseLineIcon className="size-5" />
            </button>
          </header>
          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 sm:px-6">
            <div className="relative">
              <SearchIcon
                aria-hidden
                className="absolute start-3 top-3 size-5 text-gray-500"
              />
              <input
                aria-label={t("catalogSearch")}
                maxLength={150}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("catalogSearch")}
                className={`${cropControl} ps-10`}
              />
            </div>
            <div
              className={`grid gap-5 ${kind === "crops" ? "md:grid-cols-4" : ""}`}
            >
              {kind === "crops" && (
                <aside className="bg-success-50/40 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <h3 className="mb-3 font-bold">{t("category")}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory("");
                      setPage(1);
                    }}
                    className={`mb-2 w-full rounded-lg p-2 text-start ${!category ? "bg-success-100 text-success-800" : ""}`}
                  >
                    {t("allCrops")}
                  </button>
                  {categories.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setCategory(String(item.id));
                        setPage(1);
                      }}
                      className={`w-full rounded-lg p-2 text-start ${category === String(item.id) ? "bg-success-100 text-success-800" : ""}`}
                    >
                      {item.name}
                      {item.crops_count !== undefined && (
                        <span className="ms-2">({item.crops_count})</span>
                      )}
                    </button>
                  ))}
                </aside>
              )}
              <div className={kind === "crops" ? "md:col-span-3" : ""}>
                {kind === "fertilizers" && (
                  <select
                    aria-label={t("fertilizerType")}
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                    className={`${cropControl} mb-4`}
                  >
                    <option value="">{t("allTypes")}</option>
                    {[
                      "straight",
                      "complex",
                      "mixed",
                      "water_soluble",
                      "organic",
                      "biofertilizer",
                      "micronutrient",
                      "soil_amendment",
                      "other",
                    ].map((code) => (
                      <option key={code} value={code}>
                        {t(`fertilizerTypes.${code}`)}
                      </option>
                    ))}
                  </select>
                )}
                {loading ? (
                  <p role="status" className="py-12 text-center">
                    {t("loading")}
                  </p>
                ) : error ? (
                  <CropNotice error>
                    {error}{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setAttempt((n) => n + 1)}
                    >
                      {t("retry")}
                    </button>
                  </CropNotice>
                ) : (
                  <>
                    <p className="mb-3 font-semibold">
                      {t("results", { count: data?.pagination.total ?? 0 })}
                    </p>
                    <div
                      className={`grid grid-cols-2 gap-3 ${kind === "crops" ? "lg:grid-cols-4" : "sm:grid-cols-3"}`}
                    >
                      {data?.data.map((item) => (
                        <CropChoice
                          disabled={
                            kind === "seeds" &&
                            compatibleVarietyId !== undefined &&
                            "crop_variety_id" in item &&
                            item.crop_variety_id !== null &&
                            item.crop_variety_id !== compatibleVarietyId
                          }
                          key={item.id}
                          selected={selected.some(
                            (record) => record.id === item.id,
                          )}
                          onClick={() =>
                            setSelected((current) =>
                              multiple
                                ? current.some(
                                    (record) => record.id === item.id,
                                  )
                                  ? current.filter(
                                      (record) => record.id !== item.id,
                                    )
                                  : [...current, item]
                                : [item],
                            )
                          }
                          className="flex min-h-36 flex-col items-center justify-center gap-2 text-center"
                        >
                          <CropImage
                            src={item.image}
                            name={item.name}
                            className="size-20"
                          />
                          <strong>{item.name ?? t("unavailable")}</strong>
                          {"brand_name" in item && item.brand_name && (
                            <span className="text-xs text-gray-500">
                              {item.brand_name}
                            </span>
                          )}
                        </CropChoice>
                      ))}
                    </div>
                    {!data?.data.length && (
                      <p className="py-8 text-center text-gray-500">
                        {t("noResults")}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        className={cropButton}
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        {t("previous")}
                      </button>
                      <span>
                        {t("page", {
                          page,
                          total: data?.pagination.last_page ?? 1,
                        })}
                      </span>
                      <button
                        type="button"
                        className={cropButton}
                        disabled={!data || page >= data.pagination.last_page}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {t("next")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <footer className="flex shrink-0 justify-between gap-3 border-t border-gray-200 p-5 dark:border-gray-700">
            <button type="button" className={cropButton} onClick={onClose}>
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={!multiple && !selected.length}
              className={cropPrimary}
              onClick={() => onConfirm(selected)}
            >
              {t("confirmSelection")}
            </button>
          </footer>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
