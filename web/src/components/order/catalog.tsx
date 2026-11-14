"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Catalog, CatalogItem } from "@/db/queries/menu";
import { ItemSheet } from "./item-sheet";
import { BasketBar } from "./basket-bar";

type CatalogContext = {
  catalog: Catalog;
  byId: Map<string, CatalogItem>;
  familyItems: (familyId: string) => CatalogItem[];
  openItem: (id: string) => void;
};

const Ctx = createContext<CatalogContext | null>(null);

export function useCatalog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog outside CatalogProvider");
  return c;
}

/* The menu as the browser sees it (alcohol already removed for guests and under-18s), the item
   sheet, and the basket bar. Wraps the menu page. */
export function CatalogProvider({ catalog, children, showBasket = true }: { catalog: Catalog; children: ReactNode; showBasket?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const value = useMemo<CatalogContext>(() => {
    const byId = new Map(catalog.items.map((i) => [i.id, i]));
    const fam = new Map<string, CatalogItem[]>();
    for (const i of catalog.items) if (i.familyId) fam.set(i.familyId, [...(fam.get(i.familyId) ?? []), i]);
    return { catalog, byId, familyItems: (f) => fam.get(f) ?? [], openItem: setOpenId };
  }, [catalog]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ItemSheet id={openId} onClose={() => setOpenId(null)} />
      {showBasket && <BasketBar />}
    </Ctx.Provider>
  );
}

/** "Mbuzi choma, 1 kg", plus the choice if there is one: "Kienyeji chicken, whole (wet fry)". */
export function lineName(item: CatalogItem | undefined, option: string | null) {
  const n = item?.name ?? "No longer on the menu";
  return option ? `${n} (${option.toLowerCase()})` : n;
}
