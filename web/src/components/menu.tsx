import Image from "next/image";
import Link from "next/link";
import { getMenu, toCatalog, type MenuItem } from "@/db/queries/menu";
import { getViewer } from "@/lib/session";
import { eighteenthBirthday } from "@/lib/age";
import { Price } from "@/components/ui/price";
import { Tag } from "@/components/ui/pill";
import { CatalogProvider } from "@/components/order/catalog";
import { AddButton, OpenItemButton } from "@/components/order/add-button";
import { OrderPanel } from "@/components/order/order-panel";
import { SectionBar, SectionStalk, type NavSection } from "@/components/menu/section-nav";
import { CaskRoom } from "@/components/menu/cask-room";

/* Shorter names for the culm bar on a phone, where the full ones crowd it. */
const SHORT: Record<string, string> = { breakfast: "Breakfast", grill: "Off the grill", pot: "Pots and fish", soups: "Soups", sides: "Sides", soft: "Soft drinks" };

/* The menu page below the header: the culm nav, every section in one scroll, and on desktop the
   order beside it. Alcohol never leaves the server for a guest or an account under 18; they get
   the closed Cask Room instead. */
export async function Menu() {
  const [menu, viewer] = await Promise.all([getMenu(), getViewer()]);

  const visible = menu.items.filter((i) => !i.alcohol || viewer.adult);
  const families = new Map(menu.families.map((f) => [f.id, f]));
  const byCategory = new Map<string, MenuItem[]>();
  for (const it of visible) {
    // a dish sold in several sizes shows once, by its lead size
    if (it.familyId && families.get(it.familyId)?.leadItemId !== it.id) continue;
    byCategory.set(it.categoryId, [...(byCategory.get(it.categoryId) ?? []), it]);
  }
  const fromPrice = (it: MenuItem) =>
    it.familyId ? Math.min(...visible.filter((x) => x.familyId === it.familyId).map((x) => x.price)) : it.price;
  const bottles = menu.items.filter((i) => i.alcohol).length;

  const sections = menu.categories.filter((c) => c.kind === "items" && (c.adultOnly || byCategory.get(c.id)?.length));
  const nav: NavSection[] = sections.map((c) => ({ id: c.id, name: c.adultOnly ? "The Cask Room" : c.name, short: SHORT[c.id] ?? (c.adultOnly ? "Cask Room" : c.name) }));
  const firstFood = sections.find((c) => !c.adultOnly)?.id;

  return (
    <CatalogProvider catalog={toCatalog(menu, viewer.adult)}>
      <SectionBar sections={nav} />
      <div className="mx-auto grid w-full max-w-[1360px] flex-1 gap-7 px-4 pt-5 pb-28 md:px-8 lg:grid-cols-[200px_minmax(0,1fr)_300px] lg:pt-7 lg:pb-12">
        <SectionStalk sections={nav} />
        <div className="flex min-w-0 flex-col gap-6">
          {sections.map((c) => {
            if (c.adultOnly) {
              if (viewer.adult) return <CaskRoom key={c.id} id={c.id} title={c.name} />;
              return (
                <CaskClosed
                  key={c.id}
                  id={c.id}
                  title={c.name}
                  bottles={bottles}
                  state={!viewer.user ? "guest" : !viewer.profileComplete ? "unfinished" : "minor"}
                  opensOn={viewer.user?.dateOfBirth ? eighteenthBirthday(viewer.user.dateOfBirth) : null}
                  backTo={firstFood}
                />
              );
            }
            const list = byCategory.get(c.id) ?? [];
            return (
              <section key={c.id} id={c.id} tabIndex={-1} aria-labelledby={`${c.id}-h`} className="paper-bg scroll-mt-16 rounded-3xl border border-line p-4 outline-none md:p-6 lg:scroll-mt-6">
                <h2 id={`${c.id}-h`} className="font-display text-h2 font-extrabold uppercase md:text-[2.5rem]">{c.name}</h2>
                {c.note && <p className="mt-1 font-serif text-[1rem] text-ink-2 italic md:text-lead">{c.note}</p>}
                <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] md:gap-4">
                  {list.map((it) => {
                    const name = it.familyId ? (families.get(it.familyId)?.name ?? it.name) : it.name;
                    return (
                      <li key={it.id} className="relative flex flex-col gap-1.5 overflow-hidden rounded-[14px] border border-line bg-card p-2.5 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-action md:p-3.5">
                        {it.image && (
                          <Image src={it.image} alt="" width={420} height={315} sizes="(min-width: 768px) 240px, 45vw" className="-mx-2.5 -mt-2.5 mb-1 aspect-[4/3] w-[calc(100%+1.25rem)] max-w-none object-cover md:-mx-3.5 md:-mt-3.5 md:w-[calc(100%+1.75rem)]" />
                        )}
                        <h3 className="font-display text-[1.25rem] leading-[1.05] font-extrabold uppercase md:text-[1.375rem]">
                          <OpenItemButton id={it.id}>{name}</OpenItemButton>
                        </h3>
                        {(it.description || it.kind) && (
                          <p className="line-clamp-2 text-fine text-ink-2 md:text-[0.875rem]">{it.description ?? [it.kind, it.size].filter(Boolean).join(", ")}</p>
                        )}
                        {it.tag && <Tag tone="ok" className="self-start">{it.tag}</Tag>}
                        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                          <Price amount={fromPrice(it)} from={!!it.familyId} />
                          <AddButton id={it.id} name={name} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <OrderPanel />
      </div>
    </CatalogProvider>
  );
}

const longDate = (d: string) => new Date(`${d}T12:00:00+03:00`).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });

/* The Cask Room's door, shut: why, and what to do next. Says how many drinks there are, never
   which. */
function CaskClosed({ id, title, bottles, state, opensOn, backTo }: { id: string; title: string; bottles: number; state: "guest" | "unfinished" | "minor"; opensOn: string | null; backTo?: string }) {
  const action = "inline-flex h-12 items-center justify-center rounded-full px-6 font-bold";
  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-h`} className="grove-bg relative scroll-mt-16 overflow-hidden rounded-3xl text-on-grove outline-none lg:scroll-mt-6">
      {/* shutters over the bar */}
      <div aria-hidden className="h-24 bg-[repeating-linear-gradient(90deg,rgb(0_0_0/0)_0_22px,rgb(0_0_0/0.45)_22px_30px),linear-gradient(180deg,#8a6a2e,#3b2a12)] opacity-80 md:h-28" />
      <div className="flex flex-col gap-3 p-5 md:p-7">
        <h2 id={`${id}-h`} className="font-stencil text-h1 font-black uppercase">{title}</h2>
        <p className="font-serif text-lead text-lime italic">More than {Math.floor(bottles / 50) * 50} drinks behind the bar, from Tusker to single malts.</p>
        {state === "guest" && (
          <>
            <p className="max-w-prose">The Cask Room opens when you sign in with your phone number. Kenyan law sells alcohol only to people aged 18 and over.</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link href="/sign-in" className={`${action} bg-on-grove text-grove`}>Sign in to open it</Link>
              {backTo && <a href={`#${backTo}`} className={`${action} text-on-grove underline-offset-2 hover:underline`}>Keep browsing food</a>}
            </div>
          </>
        )}
        {state === "unfinished" && (
          <>
            <p className="max-w-prose">Add your name and date of birth to open the Cask Room.</p>
            <Link href="/sign-in" className={`${action} mt-1 self-start bg-on-grove text-grove`}>Finish your account</Link>
          </>
        )}
        {state === "minor" && (
          <>
            <p className="max-w-prose">
              The Cask Room is closed, because your account says you are under 18.{opensOn ? ` It opens on ${longDate(opensOn)}.` : ""}
            </p>
            <p className="max-w-prose text-on-grove-2">Food and soft drinks are all open to you.</p>
          </>
        )}
      </div>
    </section>
  );
}
