CREATE TABLE IF NOT EXISTS "trip_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"route_id" uuid NOT NULL,
	"bus_id" uuid,
	"conductor_id" uuid,
	"driver_id" uuid,
	"departure_time" time,
	"arrival_time" time,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "templates_agency_name_unique" UNIQUE("agency_id","name")
);
--> statement-breakpoint
ALTER TABLE "agencies" ALTER COLUMN "phone" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "stops" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "scheduled_time" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "added_by" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "templates_agency_idx" ON "trip_templates" ("agency_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routes" ADD CONSTRAINT "routes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_template_id_trip_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "trip_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_templates" ADD CONSTRAINT "trip_templates_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_templates" ADD CONSTRAINT "trip_templates_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_templates" ADD CONSTRAINT "trip_templates_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_templates" ADD CONSTRAINT "trip_templates_conductor_id_users_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_templates" ADD CONSTRAINT "trip_templates_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_templates" ADD CONSTRAINT "trip_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_agency_name_unique" UNIQUE("agency_id","name");