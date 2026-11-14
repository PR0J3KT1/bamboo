import { z } from "zod";
import { normalizeKenyanPhone } from "@/lib/phone";

/* The shape of the lounge's settings, their defaults and the messages an admin sees. No database
   here, so it's tested on its own (settings-schema.test.ts); src/lib/settings.ts reads the saved
   value. */

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 18:30.");
const room = z.object({
  rate: z.number({ error: "The rate is a number of shillings, or blank." }).int("The rate is whole shillings.").min(100, "A rate is at least KES 100, or blank for “on request”.").max(1_000_000, "That rate looks too high.").nullable(),
  maxGuests: z.number({ error: "Most guests: a whole number." }).int("Most guests: a whole number.").min(1, "At least 1 guest.").max(10, "Up to 10 guests."),
});

export const SettingsSchema = z.object({
  hours: z.string().trim().min(3, "Say when the lounge is open.").max(80),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const p = normalizeKenyanPhone(v);
      if (!p) ctx.addIssue({ code: "custom", message: "That isn't a Kenyan mobile number." });
      return p ?? "";
    }),
  rating: z
    .object({
      stars: z.number({ error: "Stars are a number between 1 and 5, like 4.5." }).min(1, "Stars are between 1 and 5, like 4.5.").max(5, "Stars are between 1 and 5, like 4.5."),
      reviews: z.number({ error: "Reviews are a whole number, like 1462." }).int("Reviews are a whole number, like 1462.").min(1, "Reviews are a whole number, like 1462.").max(1_000_000, "That's more reviews than seems likely."),
    })
    .nullable(),
  rooms: z.object({
    std: room,
    dlx: room,
  }),
  ordering: z.object({ open: z.boolean(), note: z.string().trim().max(200, "Keep the note to 200 characters.") }),
  rewards: z.object({
    open: z.boolean(),
    percent: z.number({ error: "The reward is a whole percent, like 5." }).int("The reward is a whole percent, like 5.").min(1, "At least 1%.").max(20, "Up to 20% off the food."),
  }),
  tables: z
    .object({
      open: z.boolean(),
      from: hhmm,
      to: hhmm,
      maxPeople: z.number({ error: "Most people: a whole number." }).int("Most people: a whole number.").min(1, "At least 1 person.").max(200, "Up to 200 people; bigger groups are events."),
    })
    .refine((t) => t.from < t.to, { message: "The first table has to be before the last.", path: ["to"] }),
});

export type LoungeSettings = z.output<typeof SettingsSchema>;

export const DEFAULTS: LoungeSettings = {
  hours: "Open daily, 8am till late",
  phone: "+254754346559",
  rating: null, // not shown until someone confirms a current figure
  rooms: { std: { rate: 3500, maxGuests: 2 }, dlx: { rate: null, maxGuests: 2 } },
  ordering: { open: true, note: "" },
  rewards: { open: true, percent: 5 },
  tables: { open: true, from: "12:00", to: "23:00", maxPeople: 30 },
};

/** Fill what's missing from the defaults, a level deep. */
export function withDefaults(saved: unknown): LoungeSettings {
  const s = (saved && typeof saved === "object" ? saved : {}) as Partial<LoungeSettings>;
  const merged = {
    ...DEFAULTS,
    ...s,
    rooms: { std: { ...DEFAULTS.rooms.std, ...s.rooms?.std }, dlx: { ...DEFAULTS.rooms.dlx, ...s.rooms?.dlx } },
    ordering: { ...DEFAULTS.ordering, ...s.ordering },
    rewards: { ...DEFAULTS.rewards, ...s.rewards },
    tables: { ...DEFAULTS.tables, ...s.tables },
  };
  const ok = SettingsSchema.safeParse(merged);
  return ok.success ? ok.data : DEFAULTS;
}

