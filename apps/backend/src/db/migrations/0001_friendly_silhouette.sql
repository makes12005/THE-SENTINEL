DO $$ BEGIN
 CREATE TYPE "alert_channel" AS ENUM('call', 'sms', 'whatsapp', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "alert_log_status" AS ENUM('success', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_passenger_id" uuid NOT NULL,
	"channel" "alert_channel" NOT NULL,
	"status" "alert_log_status" NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response_code" varchar(64),
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "trip_passengers" ADD COLUMN "alert_channel" "alert_channel";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_logs_passenger_idx" ON "alert_logs" ("trip_passenger_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_logs" ADD CONSTRAINT "alert_logs_trip_passenger_id_trip_passengers_id_fk" FOREIGN KEY ("trip_passenger_id") REFERENCES "trip_passengers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
