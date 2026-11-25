import type { ReactNode } from "react";
import { cn } from "@/utils";

const sides = {
  top: {
    tip: "inset-x-0 bottom-full mb-2.5 justify-center",
    arrow: "start-1/2 -bottom-1 -translate-x-1/2 rtl:translate-x-1/2",
  },
  bottom: {
    tip: "inset-x-0 top-full mt-2.5 justify-center",
    arrow: "start-1/2 -top-1 -translate-x-1/2 rtl:translate-x-1/2",
  },
  start: {
    tip: "inset-y-0 end-full me-2.5 items-center",
    arrow: "-end-1 top-1/2 -translate-y-1/2",
  },
  end: {
    tip: "inset-y-0 start-full ms-2.5 items-center",
    arrow: "-start-1 top-1/2 -translate-y-1/2",
  },
} as const;

export type TooltipSide = keyof typeof sides;

/**
 * The app's tooltip: a dark bubble beside its trigger, shown on hover and on
 * keyboard focus (never on touch). Use it instead of the `title` attribute.
 *
 * - `side`: `top` (default), `bottom`, or the logical `start`/`end`, which
 *   follow the reading direction. Pick the side with room: the bubble is
 *   positioned with CSS, so an ancestor with `overflow` hidden/auto clips it.
 * - `id`: pass it when the trigger points at the bubble with `aria-describedby`
 *   (e.g. why a control is unavailable). Without it, the bubble repeats the
 *   trigger's accessible name, so give the trigger an `aria-label` and the
 *   bubble is hidden from assistive technology.
 * - Without `content`, only the trigger renders, so a tooltip can come and go
 *   without remounting the trigger.
 * - Short text stays on one line; longer text wraps at `max-w-xs`.
 * - The wrapper is an inline-flex `span`; pass `className` to place or size it
 *   (e.g. `flex w-full` for a full-width trigger, or a positioned trigger's
 *   `absolute …` classes). Use `as="div"` around block content such as a
 *   heading or a `div`, which a `span` must not contain.
 */
export default function Tooltip({
  content,
  id,
  side = "top",
  as: Wrapper = "span",
  className,
  children,
}: {
  content?: string | null;
  id?: string;
  side?: TooltipSide;
  as?: "span" | "div";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Wrapper className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      {content && (
        <span
          id={id}
          role={id ? "tooltip" : undefined}
          aria-hidden={id ? undefined : true}
          className={`pointer-events-none invisible absolute z-50 flex opacity-0 transition-opacity duration-200 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-has-focus-visible/tooltip:visible group-has-focus-visible/tooltip:opacity-100 ${sides[side].tip}`}
        >
          <span className="text-theme-xs shadow-theme-md w-max max-w-xs shrink-0 rounded-lg bg-gray-800 px-3 py-2 font-medium text-white dark:bg-gray-700 dark:text-white">
            {content}
          </span>
          <span
            className={`absolute size-3 rotate-45 bg-gray-800 dark:bg-gray-700 ${sides[side].arrow}`}
          />
        </span>
      )}
    </Wrapper>
  );
}
