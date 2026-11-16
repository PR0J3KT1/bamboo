import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { NO_EXTRAS, NO_ROOMS, type LocationExtras, type LocationRooms } from "../lib/location-extras";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

/* ───────────────────────── Better Auth ─────────────────────────
   Core tables plus the phone-number plugin's fields. A customer signs in with a Kenyan mobile
   number and a one-time code; the email is a placeholder Better Auth needs, never shown. */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),
  /* Set once, by completeProfile(). "YYYY-MM-DD", so no time zone can move the 18th birthday. */
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  role: text("role").default("customer").notNull(), // customer | staff | admin (src/lib/permissions.ts)
  /* Better Auth's admin plugin: a blocked number can't sign in or order */
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  /* Staff work at one location and see only its orders, menu and bookings. Admins see them all. */
  locationId: text("location_id"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"), // admin plugin field; impersonation is switched off
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ───────────────────────── Menu ───────────────────────── */

/* ───────────────────────── Locations ─────────────────────────
   Each Bamboo Cask lounge. The menu is shared (names, descriptions, photos), but each location
   sets its own prices and sold-out switches (locationItems). A delivery goes to the location
   nearest the drop-off; a collection to the one the customer picks. */
export const locations = pgTable("locations", {
  id: text("id").primaryKey(), // "ngara"
  name: text("name").notNull(), // "Ngara"
  area: text("area").notNull(), // "Keiyo Road, Ngara", shown to customers
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  /* blank: the numbers and hours in Settings */
  phone: text("phone"),
  hours: text("hours"),
  mapUrl: text("map_url"),
  /* the TumaBoda store riders collect from (GET /partner/locations); blank: the business default */
  tumabodaLocationId: text("tumaboda_location_id"),
  /* off: hidden from customers, no new orders or bookings */
  active: boolean("active").default(true).notNull(),
  /* the kitchen here isn't taking online orders just now */
  orderingOpen: boolean("ordering_open").default(true).notNull(),
  /* its rooms and "More at …" cards (src/lib/location-extras.ts) */
  rooms: jsonb("rooms").$type<LocationRooms>().default(NO_ROOMS).notNull(),
  extras: jsonb("extras").$type<LocationExtras>().default(NO_EXTRAS).notNull(),
  sort: integer("sort").default(0).notNull(),
  ...timestamps,
});

export const categoryKind = pgEnum("category_kind", ["items", "bundles", "party", "rooms", "games"]);

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  note: text("note"),
  kind: categoryKind("kind").default("items").notNull(),
  adultOnly: boolean("adult_only").default(false).notNull(),
  sort: integer("sort").default(0).notNull(),
});

/* Shelves of the Cask Room: whisky, gin, wine… */
export const shelves = pgTable("shelves", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sort: integer("sort").default(0).notNull(),
});

/* A dish sold in several sizes. Each size is its own item at its own price. */
export const families = pgTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sizeLabel: text("size_label").notNull(),
  leadItemId: text("lead_item_id"),
});

export type PhotoCredit = [author: string, licence: string, filePage: string, note?: string];

export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    /* Whole Kenyan shillings. */
    price: integer("price").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    /* Alcohol is never sold to a guest or an account under 18; checked on the server at checkout. */
    alcohol: boolean("alcohol").default(false).notNull(),
    familyId: text("family_id").references(() => families.id),
    portion: text("portion"),
    tag: text("tag"),
    options: jsonb("options").$type<string[]>(),
    optionLabel: text("option_label"),
    // drinks
    brand: text("brand"),
    kind: text("kind"),
    shelfId: text("shelf_id").references(() => shelves.id),
    size: text("size"),
    abv: real("abv"),
    origin: text("origin"),
    notes: text("notes"),
    serve: text("serve"),
    // pictures
    sprite: text("sprite"), // "sheet:cell" in the old sprite sheets; replaced by `image` once photos are uploaded
    image: text("image"), // URL of an uploaded photo
    photoKey: text("photo_key"), // a key into the lounge's own photos
    credit: jsonb("credit").$type<PhotoCredit>(),
    active: boolean("active").default(true).notNull(),
    sort: integer("sort").default(0).notNull(),
    ...timestamps,
  },
  (t) => [
    index("items_category_idx").on(t.categoryId),
    index("items_shelf_idx").on(t.shelfId),
    index("items_family_idx").on(t.familyId),
  ],
);

/* What each location sells, at its price. No row: not on that location's menu. */
export const locationItems = pgTable(
  "location_items",
  {
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    price: integer("price").notNull(),
    /* off: sold out here today */
    active: boolean("active").default(true).notNull(),
  },
  (t) => [primaryKey({ columns: [t.locationId, t.itemId] }), index("location_items_item_idx").on(t.itemId)],
);

/* "Who's eating?" plates: a fixed set of items, priced as the sum of its parts. */
export const bundles = pgTable("bundles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  who: text("who").notNull(), // one | two | table
  photoKey: text("photo_key"),
  sort: integer("sort").default(0).notNull(),
});

export const bundleParts = pgTable(
  "bundle_parts",
  {
    bundleId: text("bundle_id")
      .notNull()
      .references(() => bundles.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id),
    qty: integer("qty").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bundleId, t.itemId] })],
);

/* "Goes with": what to suggest beside an item. The subject is an item id or a family id. */
export const pairings = pgTable(
  "pairings",
  {
    subjectId: text("subject_id").notNull(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    sort: integer("sort").default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.subjectId, t.itemId] })],
);

export const deliveryPlaces = pgTable("delivery_places", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  detail: text("detail").notNull(),
  /* Road distance from the lounge, estimated; the rider service gives the live figure. */
  km: real("km").notNull(),
  /* The place's centre, for the rider service's fare quote. */
  lat: real("lat"),
  lng: real("lng"),
  keywords: text("keywords").notNull(),
  popular: boolean("popular").default(false).notNull(),
});

/* ───────────────────────── Orders ───────────────────────── */

export const orderMode = pgEnum("order_mode", ["delivery", "collect"]);
export const orderStatus = pgEnum("order_status", [
  "awaiting_payment",
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
]);
export const paymentMethod = pgEnum("payment_method", ["mpesa", "pay_on_delivery", "pay_at_counter"]);
export const paymentStatus = pgEnum("payment_status", ["unpaid", "pending", "paid", "failed", "refunded"]);

/* Order codes read out to staff and riders: BC-1001, BC-1002… The code is for people; the tracking
   link uses the order's random id, so nobody can look up someone else's order by guessing a code. */
export const orderCodeSeq = pgSequence("order_code_seq", { startWith: 1001 });

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /* Short code read out to staff and the rider, e.g. "BC-4821". */
    code: text("code").notNull().unique(),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    mode: orderMode("mode").notNull(),
    status: orderStatus("status").default("received").notNull(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    placeId: text("place_id").references(() => deliveryPlaces.id),
    deliveryKm: real("delivery_km"),
    directions: text("directions"),
    note: text("note"),
    hasAlcohol: boolean("has_alcohol").default(false).notNull(),
    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").default(0).notNull(),
    discount: integer("discount").default(0).notNull(),
    total: integer("total").notNull(),
    paymentMethod: paymentMethod("payment_method").notNull(),
    paymentStatus: paymentStatus("payment_status").default("unpaid").notNull(),
    mpesaCheckoutRequestId: text("mpesa_checkout_request_id").unique(),
    mpesaReceipt: text("mpesa_receipt"),
    /* why the last M-Pesa prompt didn't go through, as the customer reads it */
    paymentError: text("payment_error"),
    cancelReason: text("cancel_reason"),
    /* The rider, through TumaBoda's partner API (src/lib/tumaboda.ts) */
    tumabodaDeliveryId: text("tumaboda_delivery_id").unique(),
    tumabodaDeliveryNumber: text("tumaboda_delivery_number"),
    tumabodaStatus: text("tumaboda_status"),
    tumabodaTrackingUrl: text("tumaboda_tracking_url"),
    tumabodaError: text("tumaboda_error"),
    ...timestamps,
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_status_idx").on(t.status), index("orders_location_idx").on(t.locationId)],
);

/* Each step an order took, and who moved it: the times on the tracking page and the order's
   history in the admin. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatus("status").notNull(),
    byName: text("by_name").notNull(), // a staff member's name, "Customer", or "TumaBoda"
    note: text("note"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

/* TumaBoda webhook ids already handled: they retry, so each event may arrive more than once. */
export const tumabodaEvents = pgTable("tumaboda_events", {
  id: text("id").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderLines = pgTable(
  "order_lines",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id),
    /* Name and price as they were when ordered, so a later price change doesn't rewrite history. */
    name: text("name").notNull(),
    option: text("option"),
    unitPrice: integer("unit_price").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [index("order_lines_order_idx").on(t.orderId)],
);

/* Numbers blocked without an account (guests who only ever ordered as guests). Accounts are
   blocked through Better Auth's own fields on the user (banned, banReason). */
export const blockedNumbers = pgTable("blocked_numbers", {
  phone: text("phone").primaryKey(), // E.164, +2547…
  reason: text("reason"),
  byName: text("by_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ───────────────────────── Audit ─────────────────────────
   Every change made in the admin, with who made it and what it was before, so a price change
   or a new admin always has a name on it. */

export const auditEvents = pgTable(
  "audit_events",
  {
    id: serial("id").primaryKey(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    /* kept as written, so the record still reads right after the account is gone */
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(), // e.g. "role.set", "user.ban", "item.price", "order.status"
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

/* ───────────────────────── Relations ───────────────────────── */

export const categoriesRelations = relations(categories, ({ many }) => ({ items: many(items) }));
export const itemsRelations = relations(items, ({ one }) => ({
  category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
  shelf: one(shelves, { fields: [items.shelfId], references: [shelves.id] }),
  family: one(families, { fields: [items.familyId], references: [families.id] }),
}));
export const familiesRelations = relations(families, ({ many }) => ({ items: many(items) }));
export const bundlesRelations = relations(bundles, ({ many }) => ({ parts: many(bundleParts) }));
export const bundlePartsRelations = relations(bundleParts, ({ one }) => ({
  bundle: one(bundles, { fields: [bundleParts.bundleId], references: [bundles.id] }),
  item: one(items, { fields: [bundleParts.itemId], references: [items.id] }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  place: one(deliveryPlaces, { fields: [orders.placeId], references: [deliveryPlaces.id] }),
  lines: many(orderLines),
  events: many(orderEvents),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
export const orderLinesRelations = relations(orderLines, ({ one }) => ({
  order: one(orders, { fields: [orderLines.orderId], references: [orders.id] }),
  item: one(items, { fields: [orderLines.itemId], references: [items.id] }),
}));

/* ───────────────────────── Settings ─────────────────────────
   The lounge's details the admin edits (hours, phone, rating, room rates, whether online ordering
   and table booking are open), one JSON value per key. See src/lib/settings.ts for the shape and
   the defaults a missing key falls back to. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

/* ───────────────────────── Bookings ─────────────────────────
   A room for some nights, or a table at a time. The customer asks; staff confirm or decline in
   the admin, with a reply the customer gets by SMS. Nothing is paid online. */
export const bookingKind = pgEnum("booking_kind", ["room", "table"]);
export const bookingStatus = pgEnum("booking_status", ["requested", "confirmed", "declined", "cancelled", "completed"]);
/* Short codes read out on the phone, from BK-1001. */
export const bookingCodeSeq = pgSequence("booking_code_seq", { startWith: 1001 });

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    kind: bookingKind("kind").notNull(),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    status: bookingStatus("status").default("requested").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // E.164
    guests: integer("guests").notNull(), // people staying, or at the table
    // a room
    room: text("room"), // "std" | "dlx" (src/lib/rooms.ts)
    checkIn: date("check_in"), // YYYY-MM-DD
    nights: integer("nights"),
    rate: integer("rate"), // KES a night when asked, if the room had a rate then
    // a table
    at: timestamp("at", { withTimezone: true }), // the table's date and time
    occasion: text("occasion"), // "Match day", "Birthday"…
    note: text("note"), // from the customer
    reply: text("reply"), // from the lounge, sent by SMS with a confirm or decline
    handledBy: text("handled_by"),
    ...timestamps,
  },
  (t) => [index("bookings_status_idx").on(t.status), index("bookings_check_in_idx").on(t.checkIn), index("bookings_at_idx").on(t.at)],
);

/* ───────────────────────── Game rewards ─────────────────────────
   A solo score over the line in a rewarded game wins a code for a share off the food in one order
   (src/lib/games/core.ts, src/app/actions/rewards.ts). Each code works once, until it expires. */
export const rewardCodes = pgTable(
  "reward_codes",
  {
    code: text("code").primaryKey(), // CHEZA-7KQ2MX
    game: text("game").notNull(),
    score: integer("score").notNull(),
    percent: integer("percent").notNull(), // as it was when won
    ipHash: text("ip_hash"), // to cap how many one connection can win a day; never the address itself
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reward_codes_ip_idx").on(t.ipHash, t.createdAt)],
);
