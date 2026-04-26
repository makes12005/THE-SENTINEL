DO $$ BEGIN
 CREATE TYPE "wallet_tx_type" AS ENUM('trip_topup', 'trip_deduction');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"invite_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "agency_invites_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"trips_remaining" integer DEFAULT 0 NOT NULL,
	"trips_used_this_month" integer DEFAULT 0 NOT NULL,
	"low_trip_threshold" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_wallets_agency_id_unique" UNIQUE("agency_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"trips_amount" integer NOT NULL,
	"trips_remaining_after" integer NOT NULL,
	"type" "wallet_tx_type" NOT NULL,
	"description" text,
	"reference_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "agency_billing_config";--> statement-breakpoint
DROP TABLE "billing_transactions";--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "onboarded_via_invite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "invite_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_tx_agency_idx" ON "wallet_transactions" ("agency_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routes_agency_idx" ON "routes" ("agency_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agencies" ADD CONSTRAINT "agencies_invite_id_agency_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "agency_invites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_wallets" ADD CONSTRAINT "agency_wallets_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
