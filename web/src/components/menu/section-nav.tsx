"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type NavSection = { id: string; name: string; short?: string };

/* Which section is on screen: the last one whose top has passed a line 30% down the window. */
function useActiveSection(key: string) {
  const [active, setActive] = useState(key.split("|")[0] ?? "");
  useEffect(() => {
    const els = key.split("|").map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.3;
      let cur = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top - line <= 0) cur = el.id;
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [key]);
  return active;
}

function jump(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
  /* move focus to the section, for keyboard and screen-reader users */
  el.focus({ preventScroll: true });
}

/** Phones and tablets: the green culm across the top, one node per section, sticking under the
    header as you scroll. The section on screen is the lime node, kept in view. */
export function SectionBar({ sections }: { sections: NavSection[] }) {
  const active = useActiveSection(sections.map((s) => s.id).join("|"));
  const track = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const t = track.current;
    const on = t?.querySelector<HTMLElement>("[aria-current='true']");
    if (!t || !on) return;
    const left = on.offsetLeft - 16;
    if (left < t.scrollLeft || on.offsetLeft + on.offsetWidth > t.scrollLeft + t.clientWidth) t.scrollTo({ left: Math.max(0, left) });
  }, [active]);

  return (
    <nav aria-label="Menu sections" className="culm-bg sticky top-0 z-30 shadow-[inset_0_-3px_0_rgb(20_41_28/0.25)] lg:hidden">
      <ul ref={track} className="flex h-[52px] items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => (
          <li key={s.id} className="flex border-r-[3px] border-[#b2cf7c] last:border-r-0">
            <a
              href={`#${s.id}`}
              onClick={(e) => jump(e, s.id)}
              aria-current={active === s.id ? "true" : undefined}
              className={cn(
                "flex items-center px-4 font-semibold whitespace-nowrap text-[#f4f8e4]",
                active === s.id && "bg-lime font-bold text-on-lime",
              )}
            >
              {s.short ?? s.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Desktop: a bamboo stalk down the left with the sections hanging off it. */
export function SectionStalk({ sections }: { sections: NavSection[] }) {
  const active = useActiveSection(sections.map((s) => s.id).join("|"));
  return (
    <nav aria-label="Menu sections" className="sticky top-6 hidden self-start lg:flex">
      <div aria-hidden className="w-2.5 shrink-0 rounded-full bg-[linear-gradient(90deg,#557c33_0%,#7fa653_40%,#6e9a45_70%,#4e7330_100%)]" />
      <ul className="flex flex-col gap-0.5 pl-3.5">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => jump(e, s.id)}
              aria-current={active === s.id ? "true" : undefined}
              className={cn(
                "flex min-h-[42px] items-center rounded-full px-3.5 font-medium text-ink hover:bg-ink/5",
                active === s.id && "bg-lime font-bold text-on-lime hover:bg-lime",
              )}
            >
              {s.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
