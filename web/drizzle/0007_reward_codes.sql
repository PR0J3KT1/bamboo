CREATE TABLE "reward_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"score" integer NOT NULL,
	"percent" integer NOT NULL,
	"ip_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reward_codes" ADD CONSTRAINT "reward_codes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reward_codes_ip_idx" ON "reward_codes" USING btree ("ip_hash","created_at");