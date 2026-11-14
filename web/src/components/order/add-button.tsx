"use client";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { basket } from "@/lib/basket";
import { useCatalog } from "./catalog";

/* The + on a menu card. A plain item goes straight into the order; one with sizes or choices
   opens its sheet first. */
export function AddButton({ id, name }: { id: string; name: string }) {
  const { byId, openItem } = useCatalog();
  const toast = useToast();
  const item = byId.get(id);
  return (
    <button
      type="button"
      aria-label={`Add ${name}`}
      onClick={() => {
        if (!item || item.familyId || item.options?.length) return openItem(id);
        basket.add(id, null, 1);
        toast(`${item.name} added`);
      }}
      className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-action text-on-action transition-transform active:scale-95"
    >
      <Plus aria-hidden className="size-5" strokeWidth={2.6} />
    </button>
  );
}

/* The dish name opens its sheet; its ::after covers the whole card, so a tap anywhere does too. */
export function OpenItemButton({ id, children }: { id: string; children: React.ReactNode }) {
  const { openItem } = useCatalog();
  return (
    <button type="button" onClick={() => openItem(id)} className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-['']">
      {children}
    </button>
  );
}
