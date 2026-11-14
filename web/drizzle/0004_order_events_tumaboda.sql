CREATE TABLE "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"by_name" text NOT NULL,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tumaboda_events" (
	"id" text PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tumaboda_delivery_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tumaboda_delivery_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tumaboda_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tumaboda_tracking_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tumaboda_error" text;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tumaboda_delivery_id_unique" UNIQUE("tumaboda_delivery_id");