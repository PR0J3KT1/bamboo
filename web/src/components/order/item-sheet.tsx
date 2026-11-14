"use client";
import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { ChoicePill } from "@/components/ui/pill";
import { Price } from "@/components/ui/price";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { basket } from "@/lib/basket";
import { useCatalog } from "./catalog";
import { cn } from "@/lib/utils";

export function ItemSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { byId } = useCatalog();
  const item = id ? byId.get(id) : undefined;
  if (!item) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  /* keyed, so choices start fresh for each item */
  return <ItemSheetBody key={item.id} id={item.id} onClose={onClose} />;
}

function ItemSheetBody({ id, onClose }: { id: string; onClose: () => void }) {
  const { byId, familyItems, catalog } = useCatalog();
  const toast = useToast();
  const opened = byId.get(id)!;
  const family = opened.familyId ? catalog.families.find((f) => f.id === opened.familyId) : undefined;
  const sizes = family ? familyItems(family.id) : [];

  const [sizeId, setSizeId] = useState(opened.id);
  const [option, setOption] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const item = byId.get(sizeId) ?? opened;
  const title = family?.name ?? item.name;
  const goes = (catalog.pairs[family?.id ?? item.id] ?? catalog.pairs[item.id] ?? []).map((g) => byId.get(g)).filter((g) => !!g).slice(0, 4);

  function add() {
    if (item.options?.length && !option) {
      setError(`Choose ${item.optionLabel?.toLowerCase() ?? "one"} first.`);
      return;
    }
    basket.add(item.id, option, qty);
    toast(qty > 1 ? `${qty} added to your order` : "Added to your order");
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      media={opened.image ? <Image src={opened.image} alt={title} width={880} height={440} sizes="(min-width: 768px) 440px, 100vw" className="h-[220px] w-full object-cover" /> : undefined}
      footer={
        <div className="flex items-center gap-3">
          <Stepper value={qty} onChange={setQty} label={title} min={1} />
          <Button variant="main" size="lg" className="flex-1 justify-between" onClick={add}>
            Add to order <Price amount={item.price * qty} size="sm" />
          </Button>
        </div>
      }
    >
      {(item.description || item.kind) && (
        <p className="text-body text-ink-2">{item.description ?? item.kind}</p>
      )}
      {item.serve && <p className="font-serif text-[1rem] text-ink-2 italic">{item.serve}</p>}

      {item.alcohol && (
        <dl className="flex flex-wrap gap-x-5 gap-y-1 rounded-2xl bg-grove px-4 py-3 text-on-grove">
          {[["Size", item.size], ["Strength", item.abv !== null ? `${item.abv}%` : null], ["From", item.origin], ["Brand", item.brand]]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <dt className="text-fine text-on-grove-2">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
        </dl>
      )}

      {sizes.length > 1 && (
        <fieldset className="flex flex-col">
          <legend className="mb-2.5 font-bold">{family?.sizeLabel}</legend>
          <div className="grid grid-cols-3 gap-2">
            {sizes.map((s) => {
              const on = s.id === sizeId;
              return (
                <label
                  key={s.id}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-0.5 rounded-xl border-[1.5px] px-3 py-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus has-[:focus-visible]:ring-offset-2",
                    on ? "border-action bg-action text-on-action" : "border-line bg-card hover:border-action",
                  )}
                >
                  <input type="radio" name="size" checked={on} onChange={() => setSizeId(s.id)} className="sr-only" />
                  <span className="text-[0.875rem] font-semibold">{s.portion}</span>
                  <span className="figures text-[1.125rem] leading-none">{s.price.toLocaleString("en-KE")}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {!!item.options?.length && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">{item.optionLabel ?? "How would you like it?"}</legend>
          <div className="flex flex-wrap gap-2">
            {item.options.map((o) => (
              <ChoicePill key={o} selected={o === option} onClick={() => { setOption(o); setError(null); }}>{o}</ChoicePill>
            ))}
          </div>
          {error && <p role="alert" className="text-fine font-semibold text-danger">{error}</p>}
        </fieldset>
      )}

      {goes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-bold">Goes with</span>
          <div className="flex flex-wrap gap-2">
            {goes.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => { basket.add(g.id, null, 1); toast(`${g.name} added`); }}
                className="inline-flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line bg-card px-3.5 text-[0.875rem] font-semibold hover:border-action"
              >
                <Plus aria-hidden className="size-4 text-action" /> {g.name}
                <span className="font-medium text-ink-2">{g.price.toLocaleString("en-KE")}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
