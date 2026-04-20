import { z } from 'zod';

export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  OPERATOR = 'operator',
  DRIVER = 'driver',
  CONDUCTOR = 'conductor',
  PASSENGER = 'passenger'
}

export const PhoneSchema = z.string().regex(/^\+91\d{10}$/, 'Invalid phone number format, needs +91 and 10 digits');

export const LoginRequestSchema = z.object({
  phone: PhoneSchema,
  password: z.string().min(1)
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    role: UserRole;
    agency_id: string | null;
    name: string;
  };
}

export interface JWTPayload {
  id: string;
  role: UserRole;
  agency_id: string | null;
  name: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | ErrorDetails;
  meta?: MetaDetails;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
}

export interface MetaDetails {
  timestamp: string;
  page?: number;
  limit?: number;
  total?: number;
}

export const TripStatusEnum = z.enum(['scheduled', 'active', 'completed']);
export type TripStatus = z.infer<typeof TripStatusEnum>;

export const AlertStatusEnum = z.enum(['pending', 'sent', 'failed']);
export type AlertStatus = z.infer<typeof AlertStatusEnum>;

export const AlertChannelEnum = z.enum(['call', 'sms', 'whatsapp', 'manual']);
export type AlertChannel = z.infer<typeof AlertChannelEnum>;

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const CreateRouteSchema = z.object({
  name: z.string().min(1).max(255),
  from_city: z.string().min(1).max(255),
  to_city: z.string().min(1).max(255)
});
export type CreateRouteRequest = z.infer<typeof CreateRouteSchema>;

export const CreateStopSchema = z.object({
  name: z.string().min(1).max(255),
  sequence_number: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  trigger_radius_km: z.number().positive().default(10)
});
export type CreateStopRequest = z.infer<typeof CreateStopSchema>;

export const CreateTripSchema = z.object({
  route_id: z.string().uuid(),
  conductor_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
});
export type CreateTripRequest = z.infer<typeof CreateTripSchema>;

export const AddPassengerSchema = z.object({
  passenger_name: z.string().min(1).max(255),
  passenger_phone: z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
  stop_id: z.string().uuid()
});
export type AddPassengerRequest = z.infer<typeof AddPassengerSchema>;

export const PassengerRowSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  phone: z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
  stop_name: z.string().min(1, 'stop_name is required')
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
}

export const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  battery_level: z.number().min(0).max(100).optional(),
  accuracy_meters: z.number().positive().optional()
});
export type LocationUpdateRequest = z.infer<typeof LocationUpdateSchema>;

export const ListTripsQuerySchema = z.object({
  status: TripStatusEnum.optional()
});
export type ListTripsQuery = z.infer<typeof ListTripsQuerySchema>;
