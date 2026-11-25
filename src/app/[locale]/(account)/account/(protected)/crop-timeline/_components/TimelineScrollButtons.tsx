"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpToLineIcon, ChevronDownIcon, ChevronUpIcon } from "@/icons";
import { cn } from "@/utils";
import Tooltip from "@/components/common/Tooltip";
import { scrollBehavior, scrollEventTarget } from "./timelineScroll";

/** Pixels of the current view that stay visible after a page scroll. */
const pageOverlap = 48;
/** Within this many pixels of the top or bottom counts as being there. */
const edge = 4;

function RoundButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label} side="start" className="pointer-events-auto">
      <button
        type="button"
        aria-label={label}
        // aria-disabled, not disabled: a focused button keeps focus when it reaches the end.
        aria-disabled={disabled}
        // Mouse and touch presses leave focus in the timeline, so keyboard scrolling keeps working.
        onMouseDown={(event) => event.preventDefault()}
        onClick={disabled ? undefined : onClick}
        className={`bg-success-700 shadow-theme-lg focus-visible:outline-success-600 flex size-12 items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-white ${disabled ? "cursor-not-allowed opacity-40" : "hover:bg-success-800 dark:hover:bg-success-800"}`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/**
 * A column of Previous page, Next page and Scroll to top for the timeline's
 * scroll area, shown while the timeline can scroll. A button with nowhere to
 * go stays in place, disabled: Previous page and Scroll to top at the top,
 * Next page at the bottom. One scroll listener and one ResizeObserver keep
 * them current.
 */
export default function TimelineScrollButtons({
  scroller,
  content,
  className,
}: {
  scroller: HTMLElement | null;
  /** The timeline content, observed so expanding or filtering updates the buttons. */
  content: HTMLElement | null;
  className: string;
}) {
  const t = useTranslations("farmerCropTimeline");
  const [scrollable, setScrollable] = useState(false);
  const [above, setAbove] = useState(false);
  const [below, setBelow] = useState(false);
  // Where the last button scroll is heading, so quick clicks page on from there.
  const heading = useRef<number | null>(null);
  useEffect(() => {
    if (!scroller) return;
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      setScrollable(scrollHeight - clientHeight > edge);
      setAbove(scrollTop > edge);
      setBelow(scrollTop + clientHeight < scrollHeight - edge);
    };
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      update();
      // Once scrolling settles, page from wherever the farmer now is.
      clearTimeout(settle);
      settle = setTimeout(() => (heading.current = null), 150);
    };
    const target = scrollEventTarget(scroller);
    const frame = requestAnimationFrame(update);
    target.addEventListener("scroll", onScroll, { passive: true });
    // Resizes, and content growing or shrinking (expand, filter, notes).
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(scroller);
    if (content) observer?.observe(content);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      target.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [scroller, content]);
  if (!scroller || !scrollable) return null;
  const element = scroller;

  function scrollTo(top: number) {
    const max = Math.max(element.scrollHeight - element.clientHeight, 0);
    heading.current = Math.min(Math.max(top, 0), max);
    element.scrollTo({ top: heading.current, behavior: scrollBehavior() });
  }
  function page(direction: 1 | -1) {
    const step = Math.max(
      element.clientHeight - pageOverlap,
      element.clientHeight / 2,
    );
    scrollTo((heading.current ?? element.scrollTop) + direction * step);
  }

  return (
    <div
      className={cn(
        "pointer-events-none z-10 flex flex-col gap-2.5",
        className,
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <RoundButton
        label={t("previousPage")}
        disabled={!above}
        onClick={() => page(-1)}
      >
        <ChevronUpIcon aria-hidden="true" className="size-6" />
      </RoundButton>
      <RoundButton
        label={t("nextPage")}
        disabled={!below}
        onClick={() => page(1)}
      >
        <ChevronDownIcon aria-hidden="true" className="size-6" />
      </RoundButton>
      <RoundButton
        label={t("scrollToTop")}
        disabled={!above}
        onClick={() => scrollTo(0)}
      >
        <ArrowUpToLineIcon aria-hidden="true" className="size-6" />
      </RoundButton>
    </div>
  );
}
