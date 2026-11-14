import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
  role: text("role").default("customer").notNull(), // customer | staff | admin
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

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /* Short code read out to staff and the rider, e.g. "BC-4821". */
    code: text("code").notNull().unique(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    mode: orderMode("mode").notNull(),
    status: orderStatus("status").default("received").notNull(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    placeId: text("place_id").references(() => deliveryPlaces.id),
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
    ...timestamps,
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_status_idx").on(t.status)],
);

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
}));
export const orderLinesRelations = relations(orderLines, ({ one }) => ({
  order: one(orders, { fields: [orderLines.orderId], references: [orders.id] }),
  item: one(items, { fields: [orderLines.itemId], references: [items.id] }),
}));
