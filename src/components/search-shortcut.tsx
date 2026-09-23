"use client";

import { useEffect } from "react";

/** Pressing "/" anywhere outside a text field jumps focus to the global search box. */
export function SearchShortcut() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;

      const input = document.getElementById("global-search") as HTMLInputElement | null;
      if (input) {
        e.preventDefault();
        input.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
