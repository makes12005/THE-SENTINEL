import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
export const TripStatusEnum = z.enum(['scheduled', 'active', 'completed']);
export type TripStatus = z.infer<typeof TripStatusEnum>;

export const AlertStatusEnum = z.enum(['pending', 'sent', 'failed']);
export type AlertStatus = z.infer<typeof AlertStatusEnum>;

export const AlertChannelEnum = z.enum(['call', 'sms', 'whatsapp', 'manual']);
export type AlertChannel = z.infer<typeof AlertChannelEnum>;

// ─────────────────────────────────────────────────────────────────────────────
// Coordinates
// ─────────────────────────────────────────────────────────────────────────────
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Route & Stop
// ─────────────────────────────────────────────────────────────────────────────
export const CreateRouteSchema = z.object({
  name: z.string().min(1).max(255),
  from_city: z.string().min(1).max(255),
  to_city: z.string().min(1).max(255),
});
export type CreateRouteRequest = z.infer<typeof CreateRouteSchema>;

export const CreateStopSchema = z.object({
  name: z.string().min(1).max(255),
  sequence_number: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  trigger_radius_km: z.number().positive().default(10),
});
export type CreateStopRequest = z.infer<typeof CreateStopSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Trip
// ─────────────────────────────────────────────────────────────────────────────
export const CreateTripSchema = z.object({
  route_id: z.string().uuid(),
  conductor_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});
export type CreateTripRequest = z.infer<typeof CreateTripSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Passenger — single add (by stop_id)
// ─────────────────────────────────────────────────────────────────────────────
export const AddPassengerSchema = z.object({
  passenger_name: z.string().min(1).max(255),
  passenger_phone: z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
  stop_id: z.string().uuid(),
});
export type AddPassengerRequest = z.infer<typeof AddPassengerSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Passenger CSV upload
// ─────────────────────────────────────────────────────────────────────────────
/** One row parsed from the CSV/xlsx before DB lookup */
export const PassengerRowSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  phone: z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
  stop_name: z.string().min(1, 'stop_name is required'),
});
export type PassengerRow = z.infer<typeof PassengerRowSchema>;

/** Per-row error returned when the upload is rejected */
export interface PassengerRowError {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
}

export interface UploadPassengersResponse {
  uploaded: number;
  errors?: PassengerRowError[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Trip status endpoint response
// ─────────────────────────────────────────────────────────────────────────────
export interface PassengerAlertSummary {
  total: number;
  pending: number;
  sent: number;
  failed: number;
}

export interface TripStatusResponse {
  id: string;
  status: TripStatus;
  scheduled_date: string;
  started_at: string | null;
  completed_at: string | null;
  current_location: {
    lat: number;
    lng: number;
    recorded_at: string;
    battery_level: number | null;
    accuracy_meters: number | null;
  } | null;
  passengers: PassengerAlertSummary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Location update (conductor GPS ping)
// ─────────────────────────────────────────────────────────────────────────────
export const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  battery_level: z.number().min(0).max(100).optional(),
  accuracy_meters: z.number().positive().optional(),
});
export type LocationUpdateRequest = z.infer<typeof LocationUpdateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Query filters
// ─────────────────────────────────────────────────────────────────────────────
export const ListTripsQuerySchema = z.object({
  status: TripStatusEnum.optional(),
});
export type ListTripsQuery = z.infer<typeof ListTripsQuerySchema>;
