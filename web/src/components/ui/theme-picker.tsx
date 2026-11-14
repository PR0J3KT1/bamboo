"use client";
import { useSyncExternalStore } from "react";
import { applyTheme, THEMES, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAMES: Record<Theme, string> = { bamboo: "Bamboo", dark: "Dark", light: "Light" };

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const read = () => (document.documentElement.getAttribute("data-theme") as Theme) ?? "bamboo";

export function ThemePicker({ className, onGrove = false }: { className?: string; onGrove?: boolean }) {
  const current = useSyncExternalStore(subscribe, read, () => "bamboo" as Theme);
  return (
    <div role="group" aria-label="Theme" className={cn("inline-flex rounded-full p-1", onGrove ? "bg-on-grove/10" : "bg-ground-2", className)}>
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={current === t}
          onClick={() => applyTheme(t)}
          className={cn(
            "h-9 rounded-full px-3.5 text-[0.875rem] font-semibold",
            current === t
              ? onGrove ? "bg-on-grove text-grove" : "bg-panel text-ink shadow-sm"
              : onGrove ? "text-on-grove" : "text-ink-2",
          )}
        >
          {NAMES[t]}
        </button>
      ))}
    </div>
  );
}
