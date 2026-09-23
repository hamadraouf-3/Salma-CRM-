"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** iOS starts horizontal overflow at the wrong edge in RTL, so table lists look empty. */
export function RevealTableStart() {
  const pathname = usePathname();

  useEffect(() => {
    if (document.documentElement.dir !== "rtl") return;
    const frames = [0, 50, 300];
    const timers = frames.map((delay) =>
      window.setTimeout(() => {
        document.querySelectorAll("main .overflow-x-auto").forEach((node) => {
          const el = node as HTMLElement;
          el.scrollLeft = el.scrollWidth;
        });
      }, delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [pathname]);

  return null;
}
