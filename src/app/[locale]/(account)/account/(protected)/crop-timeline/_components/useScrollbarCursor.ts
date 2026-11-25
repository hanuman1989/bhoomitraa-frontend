import { useEffect } from "react";

/**
 * Shows a pointer cursor while the mouse is over the vertical scrollbar of
 * `scroller`, and a grabbing cursor while that scrollbar is pressed. Browsers
 * ignore `cursor` on scrollbar pseudo-elements, so the element's own cursor is
 * set while the mouse is in the scrollbar gutter. Nothing happens on touch-only
 * devices, and no event is prevented, so clicks and text selection are unchanged.
 */
export default function useScrollbarCursor(scroller: HTMLElement | null) {
  useEffect(() => {
    if (!scroller || !window.matchMedia("(any-hover: hover)").matches) return;
    const element = scroller;
    let dragging = false;
    const setCursor = (cursor: string) => {
      element.style.cursor = cursor;
    };
    // Outside the padding box but inside the element: the scrollbar, which sits
    // on the end side, or on the start side in a right-to-left layout.
    const onScrollbar = (event: MouseEvent) => {
      if (
        event.target !== element ||
        element.scrollHeight <= element.clientHeight
      )
        return false;
      const x = event.clientX - element.getBoundingClientRect().left;
      return (
        x < element.clientLeft || x >= element.clientLeft + element.clientWidth
      );
    };
    const move = (event: MouseEvent) => {
      if (!dragging) setCursor(onScrollbar(event) ? "pointer" : "");
    };
    const press = (event: MouseEvent) => {
      if (event.button !== 0 || !onScrollbar(event)) return;
      dragging = true;
      setCursor("grabbing");
    };
    const reset = () => {
      dragging = false;
      setCursor("");
    };
    element.addEventListener("mousemove", move, { passive: true });
    element.addEventListener("mousedown", press, { passive: true });
    element.addEventListener("mouseleave", reset);
    window.addEventListener("mouseup", reset);
    return () => {
      element.removeEventListener("mousemove", move);
      element.removeEventListener("mousedown", press);
      element.removeEventListener("mouseleave", reset);
      window.removeEventListener("mouseup", reset);
      reset();
    };
  }, [scroller]);
}
