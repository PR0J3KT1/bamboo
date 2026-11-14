import Link from "next/link";
import { connection } from "next/server";
import { getMenu, type MenuItem } from "@/db/queries/menu";
import { getViewer } from "@/lib/session";
import { Price } from "@/components/ui/price";
import { Tag } from "@/components/ui/pill";

export async function Menu() {
  await connection();
  const [menu, viewer] = await Promise.all([getMenu(), getViewer()]);

  /* Alcohol never leaves the server for a guest or an account under 18. */
  const visible = menu.items.filter((i) => !i.alcohol || viewer.adult);
  const families = new Map(menu.families.map((f) => [f.id, f]));
  const byCategory = new Map<string, MenuItem[]>();
  for (const it of visible) {
    // a dish sold in several sizes shows once, by its lead size
    if (it.familyId && families.get(it.familyId)?.leadItemId !== it.id) continue;
    const list = byCategory.get(it.categoryId) ?? [];
    list.push(it);
    byCategory.set(it.categoryId, list);
  }
  const fromPrice = (it: MenuItem) =>
    it.familyId ? Math.min(...visible.filter((x) => x.familyId === it.familyId).map((x) => x.price)) : it.price;

  return (
    <div className="flex flex-col gap-8">
      {menu.categories
        .filter((c) => c.kind === "items")
        .map((c) => {
          const list = byCategory.get(c.id) ?? [];
          if (c.adultOnly && !viewer.adult) {
            return (
              <section key={c.id} id={c.id} className="rounded-3xl bg-grove p-5 text-on-grove md:p-7">
                <h2 className="font-stencil text-h2 font-black uppercase">{c.name}</h2>
                <p className="mt-2 max-w-prose text-body text-on-grove [&_a]:font-semibold [&_a]:text-lime">
                  {viewer.user ? (
                    viewer.profileComplete
                      ? "The Cask Room is closed, because your account says you are under 18."
                      : <>Finish your account to open the Cask Room. <Link className="underline" href="/sign-in">Continue</Link></>
                  ) : (
                    <>The Cask Room opens when you sign in with your phone number. <Link className="underline" href="/sign-in">Sign in</Link></>
                  )}
                </p>
              </section>
            );
          }
          if (!list.length) return null;
          return (
            <section key={c.id} id={c.id} className="paper-bg rounded-3xl border border-line p-4 md:p-6">
              <h2 className="font-display text-h2 font-extrabold uppercase">{c.name}</h2>
              {c.note && <p className="mt-1 font-serif text-[1rem] text-ink-2 italic">{c.note}</p>}
              <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] md:gap-4">
                {list.map((it) => (
                  <li key={it.id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-card p-3 md:p-3.5">
                    <h3 className="font-display text-[1.25rem] leading-[1.05] font-extrabold uppercase">
                      {it.familyId ? families.get(it.familyId)?.name : it.name}
                    </h3>
                    {(it.description || it.kind) && (
                      <p className="line-clamp-2 text-fine text-ink-2">{it.description ?? [it.kind, it.size].filter(Boolean).join(", ")}</p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-1 pt-1">
                      <Price amount={fromPrice(it)} from={!!it.familyId} />
                      {it.tag && <Tag tone="ok">{it.tag}</Tag>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}
