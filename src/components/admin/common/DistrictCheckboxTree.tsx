"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { ChevronDownIcon } from "@/icons";
import type { TimelineState } from "@/types/admin/cropStageTimeline";

export default function DistrictCheckboxTree({
  states,
  selectedIds,
  onChange,
  disabled = false,
  error,
}: {
  states: TimelineState[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const t = useTranslations("stageTimelines.regions");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number[]>([]);
  const selected = new Set(selectedIds);
  const keyword = search.trim().toLocaleLowerCase();
  function change(ids: number[]) {
    if (!disabled) onChange([...new Set(ids)]);
  }
  const visible = states
    .map((state) => ({
      state,
      matches: state.name.toLocaleLowerCase().includes(keyword)
        ? state.districts
        : state.districts.filter((district) =>
            district.name.toLocaleLowerCase().includes(keyword),
          ),
    }))
    .filter(
      ({ state, matches }) =>
        !keyword ||
        state.name.toLocaleLowerCase().includes(keyword) ||
        matches.length > 0,
    );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="timeline-region-search">{t("select")}</Label>
        <span className="bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 rounded-full px-3 py-1 text-xs font-semibold">
          {t("selected", { count: selected.size })}
        </span>
      </div>
      <Input
        id="timeline-region-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("search")}
        disabled={disabled}
      />
      <div
        role="group"
        aria-label={t("select")}
        aria-describedby="timeline-region-error"
        className="custom-scrollbar max-h-80 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700"
      >
        {!visible.length && (
          <p
            role="status"
            className="p-3 text-sm text-gray-500 dark:text-gray-400"
          >
            {t(states.length ? "noMatches" : "empty")}
          </p>
        )}
        {visible.map(({ state, matches }) => {
          // Parent actions and check state always use the complete loaded district
          // set, never the search subset. Inactive saved selections remain removable.
          const eligible = state.districts.filter(
            (district) => district.is_active || selected.has(district.id),
          );
          const count = eligible.filter((district) =>
            selected.has(district.id),
          ).length;
          const checked = eligible.length > 0 && count === eligible.length;
          const mixed = count > 0 && !checked;
          const open = !!keyword || expanded.includes(state.id);
          return (
            <div key={state.id} className="py-1">
              <div className="flex items-center gap-3 rounded-lg py-2 text-sm text-gray-800 dark:text-gray-200">
                <button
                  type="button"
                  disabled={disabled}
                  aria-expanded={open}
                  aria-controls={`timeline-state-${state.id}`}
                  aria-label={t(open ? "collapse" : "expand", {
                    name: state.name,
                  })}
                  onClick={() =>
                    setExpanded((ids) =>
                      ids.includes(state.id)
                        ? ids.filter((id) => id !== state.id)
                        : [...ids, state.id],
                    )
                  }
                  className="focus-visible:outline-brand-500 rounded p-1 focus-visible:outline-2 disabled:opacity-50"
                >
                  <ChevronDownIcon
                    aria-hidden="true"
                    className={`size-4 transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`}
                  />
                </button>
                <input
                  id={`timeline-state-check-${state.id}`}
                  type="checkbox"
                  checked={checked}
                  aria-checked={mixed ? "mixed" : checked}
                  ref={(input) => {
                    if (input) input.indeterminate = mixed;
                  }}
                  disabled={disabled || eligible.length === 0}
                  onChange={() => {
                    if (disabled) return;
                    const allIds = new Set(
                      state.districts.map((district) => district.id),
                    );
                    change(
                      checked
                        ? selectedIds.filter((id) => !allIds.has(id))
                        : [
                            ...selectedIds,
                            ...state.districts
                              .filter((district) => district.is_active)
                              .map((district) => district.id),
                          ],
                    );
                  }}
                  className="accent-brand-600 focus-visible:outline-brand-500 size-4 shrink-0 rounded border-gray-300 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-600"
                />
                <label
                  htmlFor={`timeline-state-check-${state.id}`}
                  className="min-w-0 flex-1 font-semibold"
                >
                  {state.name}{" "}
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    {t("stateCount", {
                      selected: count,
                      total: eligible.length,
                    })}
                  </span>
                </label>
                {!state.is_active && (
                  <span className="text-warning-700 dark:text-warning-400 text-xs">
                    {t("inactive")}
                  </span>
                )}
              </div>
              <div
                id={`timeline-state-${state.id}`}
                hidden={!open}
                className="space-y-2 ps-12 pb-2"
              >
                {!matches.length && (
                  <p className="text-xs text-gray-500">{t("noDistricts")}</p>
                )}
                {matches.map((district) => (
                  <label
                    key={district.id}
                    className="flex items-center gap-3 py-1 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(district.id)}
                      disabled={
                        disabled ||
                        (!district.is_active && !selected.has(district.id))
                      }
                      onChange={(event) => {
                        if (
                          disabled ||
                          (!district.is_active && !selected.has(district.id))
                        )
                          return;
                        change(
                          event.target.checked
                            ? [...selectedIds, district.id]
                            : selectedIds.filter((id) => id !== district.id),
                        );
                      }}
                      className="accent-brand-600 focus-visible:outline-brand-500 size-4 shrink-0 rounded border-gray-300 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-600"
                    />
                    <span>{district.name}</span>
                    {!district.is_active && (
                      <span className="text-warning-700 dark:text-warning-400 text-xs">
                        {t("inactive")}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p
        id="timeline-region-error"
        role="alert"
        className="text-error-600 dark:text-error-400 text-xs"
      >
        {error}
      </p>
    </div>
  );
}
