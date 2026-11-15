CREATE TABLE "location_items" (
	"location_id" text NOT NULL,
	"item_id" text NOT NULL,
	"price" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "location_items_location_id_item_id_pk" PRIMARY KEY("location_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"phone" text,
	"hours" text,
	"map_url" text,
	"tumaboda_location_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"ordering_open" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "locations" ("id", "name", "area", "lat", "lng", "map_url") VALUES ('ngara', 'Ngara', 'Keiyo Road, Ngara', -1.2738, 36.8245, 'https://www.google.com/maps/search/?api=1&query=Bamboo+Cask+Lounge+Keiyo+Road+Ngara');--> statement-breakpoint
INSERT INTO "location_items" ("location_id", "item_id", "price", "active") SELECT 'ngara', "id", "price", "active" FROM "items";--> statement-breakpoint
UPDATE "items" SET "active" = true;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "location_id" text NOT NULL DEFAULT 'ngara';--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "location_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "location_id" text NOT NULL DEFAULT 'ngara';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "location_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "location_id" text;--> statement-breakpoint
UPDATE "user" SET "location_id" = 'ngara' WHERE "role" IN ('staff', 'manager');--> statement-breakpoint
ALTER TABLE "location_items" ADD CONSTRAINT "location_items_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_items" ADD CONSTRAINT "location_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_items_item_idx" ON "location_items" USING btree ("item_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_location_idx" ON "orders" USING btree ("location_id");