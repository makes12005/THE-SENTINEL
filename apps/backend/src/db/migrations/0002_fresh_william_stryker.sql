DO $$ BEGIN
 CREATE TYPE "billing_tx_type" AS ENUM('topup', 'alert_deduction');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_billing_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"balance_paise" bigint DEFAULT 0 NOT NULL,
	"per_alert_paise" integer DEFAULT 200 NOT NULL,
	"low_balance_threshold_paise" bigint DEFAULT 10000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_billing_config_agency_id_unique" UNIQUE("agency_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"balance_after_paise" bigint NOT NULL,
	"type" "billing_tx_type" NOT NULL,
	"description" text,
	"reference_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agencies" ALTER COLUMN "phone" SET DATA TYPE varchar(12);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "invite_code" varchar(20);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_tx_agency_idx" ON "billing_transactions" ("agency_id","created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_billing_config" ADD CONSTRAINT "agency_billing_config_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_invite_code_unique" UNIQUE("invite_code");