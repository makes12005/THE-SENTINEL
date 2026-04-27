import { z } from 'zod';

export const TripStatusEnum = z.enum(['scheduled', 'active', 'completed']);
export type TripStatus = z.infer<typeof TripStatusEnum>;

export const AlertStatusEnum = z.enum(['pending', 'sent', 'failed']);
export type AlertStatus = z.infer<typeof AlertStatusEnum>;

export const AlertChannelEnum = z.enum(['call', 'sms', 'whatsapp', 'manual']);
export type AlertChannel = z.infer<typeof AlertChannelEnum>;

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const CreateRouteSchema = z
  .object({
    name: z.string().min(1).max(255),
    fromCity: z.string().min(1).max(255).optional(),
    from_city: z.string().min(1).max(255).optional(),
    toCity: z.string().min(1).max(255).optional(),
    to_city: z.string().min(1).max(255).optional(),
  })
  .transform((data) => ({
    name: data.name,
    from_city: data.from_city ?? data.fromCity ?? '',
    to_city: data.to_city ?? data.toCity ?? '',
  }))
  .refine((data) => Boolean(data.from_city && data.to_city), {
    message: 'from_city/to_city (or fromCity/toCity) is required',
  });
export type CreateRouteRequest = z.infer<typeof CreateRouteSchema>;

export const CreateStopSchema = z
  .object({
    name: z.string().min(1).max(255),
    sequence_number: z.number().int().positive().optional(),
    sequenceNumber: z.number().int().positive().optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    trigger_radius_km: z.number().positive().optional(),
    triggerRadiusKm: z.number().positive().optional(),
  })
  .transform((data) => ({
    name: data.name,
    sequence_number: data.sequence_number ?? data.sequenceNumber ?? 0,
    latitude: data.latitude,
    longitude: data.longitude,
    trigger_radius_km: data.trigger_radius_km ?? data.triggerRadiusKm ?? 10,
  }))
  .refine((data) => data.sequence_number > 0, {
    message: 'sequence_number (or sequenceNumber) is required',
  });
export type CreateStopRequest = z.infer<typeof CreateStopSchema>;

export const CreateTripSchema = z
  .object({
    route_id: z.string().uuid().optional(),
    routeId: z.string().uuid().optional(),
    conductor_id: z.string().uuid().optional(),
    conductorId: z.string().uuid().optional(),
    driver_id: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    bus_id: z.string().uuid().optional(),
    busId: z.string().uuid().optional(),
    assigned_operator_id: z.string().uuid().nullable().optional(),
    assignedOperatorId: z.string().uuid().nullable().optional(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  })
  .transform((data) => ({
    route_id: data.route_id ?? data.routeId ?? '',
    conductor_id: data.conductor_id ?? data.conductorId ?? '',
    driver_id: data.driver_id ?? data.driverId,
    bus_id: data.bus_id ?? data.busId,
    assigned_operator_id: data.assigned_operator_id ?? data.assignedOperatorId,
    scheduled_date: data.scheduled_date ?? data.scheduledDate ?? '',
  }))
  .refine((data) => Boolean(data.route_id && data.conductor_id && data.scheduled_date), {
    message: 'route_id/conductor_id/scheduled_date are required',
  });
export type CreateTripRequest = z.infer<typeof CreateTripSchema>;

export const AddPassengerSchema = z.object({
  passenger_name: z.string().min(1).max(255),
  passenger_phone: z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
  stop_id: z.string().uuid(),
});
export type AddPassengerRequest = z.infer<typeof AddPassengerSchema>;

export const PassengerRowSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  phone: z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
  stop_name: z.string().min(1, 'stop_name is required'),
});
export type PassengerRow = z.infer<typeof PassengerRowSchema>;

export interface PassengerRowError {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
}

export interface UploadPassengersResponse {
  uploaded: number;
  errors?: PassengerRowError[];
}

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
  passenger_summary?: PassengerAlertSummary;
}

export const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  battery_level: z.number().min(0).max(100).optional(),
  accuracy_meters: z.number().positive().optional(),
});
export type LocationUpdateRequest = z.infer<typeof LocationUpdateSchema>;

export const ListTripsQuerySchema = z.object({
  status: TripStatusEnum.optional(),
  unassigned: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((value) => value === true || value === 'true'),
});
export type ListTripsQuery = z.infer<typeof ListTripsQuerySchema>;
