import Link from "next/link";
import { getMenu, toCatalog, type MenuItem } from "@/db/queries/menu";
import { customerLocation } from "@/lib/locations";
import { fromRate, roomsOffered } from "@/lib/location-extras";
import { getViewer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { eighteenthBirthday } from "@/lib/age";
import { Price } from "@/components/ui/price";
import { Tag } from "@/components/ui/pill";
import { CatalogProvider } from "@/components/order/catalog";
import { AddButton, OpenItemButton } from "@/components/order/add-button";
import { OrderPanel } from "@/components/order/order-panel";
import { SectionBar, SectionStalk, type NavSection } from "@/components/menu/section-nav";
import { CaskRoom } from "@/components/menu/cask-room";
import { Pic } from "@/components/ui/picture";
import { MoreAtLounge } from "@/components/menu/more-at-lounge";
import { WhosEating } from "@/components/menu/whos-eating";
import { PartyCards } from "@/components/menu/party-cards";
import { loungePhoto, pictureFor } from "@/lib/pictures";
import Image from "next/image";

/* Shorter names for the culm bar on a phone, where the full ones crowd it. */
const SHORT: Record<string, string> = { who: "Who's eating?", party: "Parties", games: "Games", rooms: "Rooms", breakfast: "Breakfast", grill: "Off the grill", pot: "Pots and fish", soups: "Soups", sides: "Sides", soft: "Soft drinks" };

/* The menu page below the header: the culm nav, every section in one scroll, and on desktop the
   order beside it. Alcohol never leaves the server for a guest or an account under 18; they get
   the closed Cask Room instead. */
export async function Menu() {
  const here = await customerLocation();
  const [menu, viewer, settings] = await Promise.all([getMenu(here.id), getViewer(), getSettings()]);
  const hasRooms = roomsOffered(here.rooms).length > 0;
  const roomsFrom = fromRate(here.rooms);

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

  const hasPlates = menu.bundles.length > 0;
  const sections = menu.categories.filter((c) => (c.kind === "items" && (c.adultOnly || byCategory.get(c.id)?.length)) || (c.kind === "bundles" && hasPlates) || c.kind === "party" || c.kind === "games" || (c.kind === "rooms" && hasRooms));
  const nav: NavSection[] = sections.map((c) => ({ id: c.id, name: c.adultOnly ? "The Cask Room" : c.name, short: SHORT[c.id] ?? (c.adultOnly ? "Cask Room" : c.name) }));
  const firstFood = sections.find((c) => !c.adultOnly)?.id;

  return (
    <CatalogProvider catalog={toCatalog(menu, viewer.adult)}>
      <SectionBar sections={nav} />
      <div className="mx-auto grid w-full max-w-[1360px] flex-1 gap-7 px-4 pt-5 pb-10 md:px-8 lg:grid-cols-[200px_minmax(0,1fr)_300px] lg:pt-7 lg:pb-12">
        <SectionStalk sections={nav} />
        <main id="main" tabIndex={-1} className="flex min-w-0 flex-col gap-6 outline-none">
          {!settings.ordering.open && (
            <div role="status" className="flex flex-col gap-1 rounded-2xl border-[1.5px] border-warn bg-warn-soft p-4 text-warn-ink">
              <p className="font-bold">Not taking orders online just now.</p>
              <p>{settings.ordering.note || "Have a look at the menu, and call or WhatsApp the lounge to order."}</p>
            </div>
          )}
          {sections.map((c) => {
            if (c.kind === "bundles") return <WhosEating key={c.id} id={c.id} title={c.name} note={c.note} />;
            if (c.kind === "party") return <PartyCards key={c.id} id={c.id} title={c.name} note={null} />;
            if (c.kind === "games") return <Teaser key={c.id} id={c.id} title="Cheza!" line="Quizzes, party games and skill games for the table. Solo, or in teams on one phone." badge={settings.rewards.open ? `Win ${settings.rewards.percent}% off the food` : null} href="/games" go="Play a game" photo="/games/headsup.webp" />;
            if (c.kind === "rooms") return <Teaser key={c.id} id={c.id} title="Rooms upstairs" line={`${roomsOffered(here.rooms).map((id) => (id === "std" ? "Standard" : "Deluxe")).join(" and ")} rooms above the lounge, with room service from the kitchen, 24 hours.`} badge={roomsFrom ? `From KES ${roomsFrom.toLocaleString("en-KE")} a night` : null} href="/rooms" go="See the rooms" photo="/rooms/dlx-2-xl.webp" />;
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
                    const pic = pictureFor(it);
                    return (
                      <li key={it.id} className="relative flex flex-col gap-1.5 overflow-hidden rounded-[14px] border border-line bg-card p-2.5 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-action md:p-3.5">
                        {pic && (
                          <div className="relative -mx-2.5 -mt-2.5 mb-1 aspect-[4/3] overflow-hidden md:-mx-3.5 md:-mt-3.5">
                            <Pic picture={pic} alt={pic.kind === "photo" ? pic.alt : name} sizes="(min-width: 1024px) 240px, (min-width: 768px) 30vw, 45vw" />
                          </div>
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
          <MoreAtLounge />
        </main>
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
  const ph = loungePhoto("whisky");
  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-h`} className="cane-panel scroll-mt-16 overflow-hidden rounded-3xl outline-none lg:scroll-mt-6">
      <div className="relative z-10 grid gap-5 p-6 sm:grid-cols-[minmax(0,1fr)_auto] md:p-8">
        <div className="flex flex-col items-start gap-3">
          <p className="flex items-center gap-2 text-fine font-bold text-[#285418]">
            Behind the bar <span className="rounded-full border border-danger/50 px-2 text-danger-ink">18+</span>
          </p>
          <h2 id={`${id}-h`} className="font-stencil text-h1 font-black text-[#285418] uppercase md:text-[4rem]">{title}</h2>
          <p className="max-w-[34ch] font-serif text-lead text-[#3c4a2c] italic">More than {Math.floor(bottles / 50) * 50} drinks: whisky, cognac, wine and champagne at the bar, or sent to your gate with the food.</p>
          {state === "guest" && (
            <>
              <p className="max-w-prose text-[#2b331f]">It opens when you sign in with your phone number. Kenyan law sells alcohol only to people aged 18 and over.</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <Link href="/sign-in" className={`${action} brass-btn`}>Sign in to open it</Link>
                {backTo && <a href={`#${backTo}`} className={`${action} text-[#285418] underline-offset-2 hover:underline`}>Keep browsing food</a>}
              </div>
            </>
          )}
          {state === "unfinished" && (
            <>
              <p className="max-w-prose text-[#2b331f]">Add your name and date of birth to open it.</p>
              <Link href="/sign-in" className={`${action} brass-btn mt-1`}>Finish your account</Link>
            </>
          )}
          {state === "minor" && (
            <p className="max-w-prose text-[#2b331f]">
              It&rsquo;s closed, because your account says you are under 18.{opensOn ? ` It opens on ${longDate(opensOn)}.` : ""} Food and soft drinks are all open to you.
            </p>
          )}
        </div>
        {ph && (
          <div className="relative hidden aspect-[3/4] w-[clamp(140px,18vw,220px)] self-center overflow-hidden rounded-t-full rounded-b-2xl shadow-[0_0_0_4px_rgb(185_163_106/0.6),0_18px_40px_rgb(40_30_8/0.3)] sm:block">
            <Image src={ph.src} alt={ph.alt} fill sizes="220px" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

/* A section that leads to its own page: the games, the rooms. */
function Teaser({ id, title, line, badge, href, go, photo }: { id: string; title: string; line: string; badge: string | null; href: string; go: string; photo: string }) {
  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-h`} className="grove-bg relative isolate scroll-mt-16 overflow-hidden rounded-3xl text-on-grove outline-none lg:scroll-mt-6">
      <Image src={photo} alt="" fill sizes="(min-width: 1024px) 760px, 100vw" className="-z-20 object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(14_28_19/0.92)_0%,rgb(14_28_19/0.7)_55%,rgb(14_28_19/0.35)_100%)]" />
      <div className="flex flex-col items-start gap-3 p-6 md:p-8">
        <h2 id={`${id}-h`} className="font-stencil text-h1 font-black uppercase">{title}</h2>
        <p className="max-w-md font-serif text-lead italic">{line}</p>
        {badge && <span className="rounded-full bg-lime px-3.5 py-1 font-semibold text-on-lime">{badge}</span>}
        <Link href={href} className="brass-btn mt-1 inline-flex h-12 items-center rounded-full px-6 font-bold">{go}</Link>
      </div>
    </section>
  );
}
