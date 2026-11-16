"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/admin/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { displayPhone } from "@/lib/phone";
import type { LoungeSettings } from "@/lib/settings";
import { saveSettings } from "./actions";
import { cn } from "@/lib/utils";

const card = "flex flex-col gap-4 rounded-2xl border border-line bg-panel p-4 md:p-5";
const input = "h-11 rounded-xl border-[1.5px] border-line bg-card px-3 aria-invalid:border-danger";

function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className={cn("text-fine", error ? "font-semibold text-danger" : "text-ink-2")}>{hint}</span>}
    </label>
  );
}


/* Every setting on one page, saved together. Numbers are typed as text so a blank stays blank
   (a blank stays blank). Rooms and the "More at" cards are on each location, above. */
export function SettingsForm({ initial }: { initial: LoungeSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState({
    hours: initial.hours,
    phone: displayPhone(initial.phone),
    showRating: !!initial.rating,
    stars: String(initial.rating?.stars ?? ""),
    reviews: String(initial.rating?.reviews ?? ""),
    orderingOpen: initial.ordering.open,
    orderingNote: initial.ordering.note,
    rewardsOpen: initial.rewards.open,
    rewardPct: String(initial.rewards.percent),
    tablesOpen: initial.tables.open,
    from: initial.tables.from,
    to: initial.tables.to,
    maxPeople: String(initial.tables.maxPeople),
  });
  const [bad, setBad] = useState<{ field?: string; error: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((x) => ({ ...x, [k]: v }));
  const isBad = (f: string) => bad?.field === f;

  function save() {
    setBad(null);
    const value = {
      hours: s.hours,
      phone: s.phone,
      rating: s.showRating ? { stars: Number(s.stars), reviews: Number(s.reviews.replace(/\D/g, "")) } : null,
      ordering: { open: s.orderingOpen, note: s.orderingNote },
      rewards: { open: s.rewardsOpen, percent: Number(s.rewardPct) },
      tables: { open: s.tablesOpen, from: s.from, to: s.to, maxPeople: Number(s.maxPeople) },
    } as LoungeSettings;
    start(async () => {
      const r = await saveSettings(value);
      if (!r.ok) {
        setBad({ field: r.field, error: r.error });
        toast(r.error, "danger");
        return;
      }
      toast(r.message);
      router.refresh();
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className={card} aria-labelledby="s-open">
        <h2 id="s-open" className="font-display text-[1.5rem] font-extrabold uppercase">Open online</h2>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">Taking orders online</p>
            <p className="text-fine text-ink-2">Off: the menu still shows, with your note, and checkout is closed. Use it when the kitchen closes or is too busy.</p>
          </div>
          <Switch aria-label="Taking orders online" checked={s.orderingOpen} onCheckedChange={(v) => set("orderingOpen", !!v)} />
        </div>
        {!s.orderingOpen && (
          <Field label="Note for customers" hint="Shown on the menu and at checkout. Up to 200 characters." error={isBad("ordering.note")}>
            <input className={input} maxLength={200} value={s.orderingNote} onChange={(e) => set("orderingNote", e.target.value)} placeholder="The kitchen is closed. Back tomorrow from 8am." />
          </Field>
        )}
        <div className="flex items-start justify-between gap-4 border-t border-line-2 pt-4">
          <div>
            <p className="font-semibold">Booking tables online</p>
            <p className="text-fine text-ink-2">Off: the Book a table page asks people to call or WhatsApp instead.</p>
          </div>
          <Switch aria-label="Booking tables online" checked={s.tablesOpen} onCheckedChange={(v) => set("tablesOpen", !!v)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="First table" hint={isBad("tables.from") ? bad!.error : undefined} error={isBad("tables.from")}>
            <input type="time" className={input} aria-invalid={isBad("tables.from") || undefined} value={s.from} onChange={(e) => set("from", e.target.value)} />
          </Field>
          <Field label="Last table" hint={isBad("tables.to") ? bad!.error : undefined} error={isBad("tables.to")}>
            <input type="time" className={input} aria-invalid={isBad("tables.to") || undefined} value={s.to} onChange={(e) => set("to", e.target.value)} />
          </Field>
          <Field label="Most people at a table" hint={isBad("tables.maxPeople") ? bad!.error : "Bigger groups plan an event."} error={isBad("tables.maxPeople")}>
            <input inputMode="numeric" className={input} aria-invalid={isBad("tables.maxPeople") || undefined} value={s.maxPeople} onChange={(e) => set("maxPeople", e.target.value)} />
          </Field>
        </div>
      </section>

      <section className={card} aria-labelledby="s-games">
        <h2 id="s-games" className="font-display text-[1.5rem] font-extrabold uppercase">Game rewards</h2>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">Give codes for high scores</p>
            <p className="text-fine text-ink-2">A solo score over the line in a quiz or skill game wins a one-off code for a share off the food in one order. Codes last 14 days; one connection can win 5 a day.</p>
          </div>
          <Switch aria-label="Give codes for high scores" checked={s.rewardsOpen} onCheckedChange={(v) => set("rewardsOpen", !!v)} />
        </div>
        <Field label="Percent off the food" className="max-w-48" hint={isBad("rewards.percent") ? bad!.error : "Drinks aren't included."} error={isBad("rewards.percent")}>
          <input inputMode="numeric" className={input} aria-invalid={isBad("rewards.percent") || undefined} value={s.rewardPct} onChange={(e) => set("rewardPct", e.target.value)} />
        </Field>
      </section>

      <section className={card} aria-labelledby="s-lounge">
        <h2 id="s-lounge" className="font-display text-[1.5rem] font-extrabold uppercase">The lounge</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Opening hours" hint={isBad("hours") ? bad!.error : "As customers read it, e.g. “Open daily, 8am till late”."} error={isBad("hours")}>
            <input className={input} aria-invalid={isBad("hours") || undefined} maxLength={80} value={s.hours} onChange={(e) => set("hours", e.target.value)} />
          </Field>
          <Field label="Phone and WhatsApp" hint={isBad("phone") ? bad!.error : "Used for Call, WhatsApp and the SMS customers get."} error={isBad("phone")}>
            <input type="tel" className={input} aria-invalid={isBad("phone") || undefined} value={s.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
        <div className="flex items-start justify-between gap-4 border-t border-line-2 pt-4">
          <div>
            <p className="font-semibold">Show the Google rating</p>
            <p className="text-fine text-ink-2">On the menu&rsquo;s first screen. Keep it current: copy it from the lounge&rsquo;s Google listing.</p>
          </div>
          <Switch aria-label="Show the Google rating" checked={s.showRating} onCheckedChange={(v) => set("showRating", !!v)} />
        </div>
        {s.showRating && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Stars" hint={isBad("rating.stars") ? bad!.error : undefined} error={isBad("rating.stars")}>
              <input inputMode="decimal" className={input} aria-invalid={isBad("rating.stars") || undefined} value={s.stars} onChange={(e) => set("stars", e.target.value)} placeholder="4.5" />
            </Field>
            <Field label="Number of reviews" hint={isBad("rating.reviews") ? bad!.error : undefined} error={isBad("rating.reviews")}>
              <input inputMode="numeric" className={input} aria-invalid={isBad("rating.reviews") || undefined} value={s.reviews} onChange={(e) => set("reviews", e.target.value)} placeholder="1462" />
            </Field>
          </div>
        )}
      </section>

      {bad && <p role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger-ink">{bad.error}</p>}
      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-line bg-ground-2/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-2xl md:border">
        <Button type="submit" variant="main" size="lg" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
      </div>
    </form>
  );
}
