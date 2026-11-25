/** Smooth scrolling, or an instant jump when the farmer prefers reduced motion. */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/**
 * The nearest ancestor that scrolls vertically. On the full page this is the
 * account shell's main area; the document is only a fallback.
 */
export function scrollParent(element: HTMLElement): HTMLElement {
  for (let node = element.parentElement; node; node = node.parentElement)
    if (/auto|scroll|overlay/.test(getComputedStyle(node).overflowY))
      return node;
  return (
    (document.scrollingElement as HTMLElement | null) ??
    document.documentElement
  );
}

/** The document scroller reports its scroll events on the window. */
export function scrollEventTarget(scroller: HTMLElement): HTMLElement | Window {
  return scroller === document.scrollingElement ? window : scroller;
}
