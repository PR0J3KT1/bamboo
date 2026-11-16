ALTER TABLE "locations" ADD COLUMN "rooms" jsonb DEFAULT '{"std":{"offered":false,"rate":3500,"maxGuests":2},"dlx":{"offered":false,"rate":null,"maxGuests":2},"nearby":null}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "extras" jsonb DEFAULT '{"sports":{"on":false,"body":null},"events":{"on":false,"body":null},"carwash":{"on":false,"body":null}}'::jsonb NOT NULL;--> statement-breakpoint
-- the lounges already open keep what the site showed: both rooms, at the rates in Settings, and every card
UPDATE "locations" SET
  "rooms" = jsonb_build_object(
    'std', '{"offered":true,"rate":3500,"maxGuests":2}'::jsonb || coalesce((SELECT "value"->'rooms'->'std' FROM "settings" WHERE "key" = 'lounge'), '{}'::jsonb),
    'dlx', '{"offered":true,"rate":null,"maxGuests":2}'::jsonb || coalesce((SELECT "value"->'rooms'->'dlx' FROM "settings" WHERE "key" = 'lounge'), '{}'::jsonb),
    'nearby', CASE WHEN "id" = 'ngara' THEN 'Close to the CBD, Parklands and Pangani' END
  ),
  "extras" = '{"sports":{"on":true,"body":null},"events":{"on":true,"body":null},"carwash":{"on":true,"body":null}}'::jsonb;
--> statement-breakpoint
UPDATE "settings" SET "value" = "value" - 'rooms' WHERE "key" = 'lounge';
