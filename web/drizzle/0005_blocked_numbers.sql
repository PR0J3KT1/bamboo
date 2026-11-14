CREATE TABLE "blocked_numbers" (
	"phone" text PRIMARY KEY NOT NULL,
	"reason" text,
	"by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
