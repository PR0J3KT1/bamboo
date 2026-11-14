import { cn } from "@/lib/utils";

/** The barrel with a bamboo leaf, from the old site. */
export function BarrelMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <path d="M11 7.5c-2.2 3.6-3.2 8-3.2 12.5s1 8.9 3.2 12.5h18c2.2-3.6 3.2-8 3.2-12.5S31.2 11.1 29 7.5z" fill="#C9862A" />
      <path d="M9.4 13h21.2M8.2 20h23.6M9.4 27h21.2" stroke="#3A230C" strokeWidth="2.2" />
      <path d="M16 7.5c-.9 4-1.3 8.2-1.3 12.5s.4 8.5 1.3 12.5M24 7.5c.9 4 1.3 8.2 1.3 12.5S24.9 28.5 24 32.5" stroke="#3A230C" strokeWidth="1" opacity=".45" fill="none" />
      <path d="M27.5 4.2c4.6.4 7.2 3.6 7 8-4.4-.5-7-3.5-7-8z" fill="#8DB36A" />
      <path d="M27.8 4.6l4.8 6.6" stroke="#3E5A25" strokeWidth=".9" />
    </svg>
  );
}

/** Mark and name, for the top of a page. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BarrelMark className="size-9 shrink-0 md:size-10" />
      <span className="flex flex-col leading-none">
        <span className="font-stencil text-[1.5rem] font-black tracking-[.02em] md:text-[1.75rem]">BAMBOO CASK</span>
        <span className="mt-0.5 text-fine font-semibold text-on-grove-2">Lounge, Ngara</span>
      </span>
    </span>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

