DO $$ BEGIN
 CREATE TYPE "boarding_status" AS ENUM('pending', 'boarded', 'absent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "route_source" AS ENUM('scratch', 'popular', 'library');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "geo_coordinates_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"captured_by_user_id" uuid NOT NULL,
	"captured_by_name" varchar(255) NOT NULL,
	"agency_id" uuid NOT NULL,
	"agency_name" varchar(255) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "popular_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"from_city" varchar(255) NOT NULL,
	"to_city" varchar(255) NOT NULL,
	"stops" jsonb NOT NULL,
	"published_by_agency_id" uuid NOT NULL,
	"published_by_agency_name" varchar(255) NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "source" "route_source" DEFAULT 'scratch' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_passengers" ADD COLUMN "pickup_point" text;--> statement-breakpoint
ALTER TABLE "trip_passengers" ADD COLUMN "seat_no" varchar(50);--> statement-breakpoint
ALTER TABLE "trip_passengers" ADD COLUMN "boarding_status" "boarding_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_passengers" ADD COLUMN "boarded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_library_verified_use_count_idx" ON "geo_coordinates_library" ("verified","use_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_library_agency_idx" ON "geo_coordinates_library" ("agency_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popular_routes_approved_use_count_idx" ON "popular_routes" ("is_approved","use_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popular_routes_agency_idx" ON "popular_routes" ("published_by_agency_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "notes";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "geo_coordinates_library" ADD CONSTRAINT "geo_coordinates_library_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "geo_coordinates_library" ADD CONSTRAINT "geo_coordinates_library_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popular_routes" ADD CONSTRAINT "popular_routes_published_by_agency_id_agencies_id_fk" FOREIGN KEY ("published_by_agency_id") REFERENCES "agencies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
