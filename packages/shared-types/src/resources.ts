import { z } from 'zod';

export const CreateBusSchema = z.object({
  number_plate: z.string().min(1).max(20).toUpperCase(),
  model: z.string().min(1).max(255).optional(),
  capacity: z.number().int().positive().optional(),
});
export type CreateBusRequest = z.infer<typeof CreateBusSchema>;

export const UpdateBusSchema = z.object({
  model: z.string().min(1).max(255).optional(),
  capacity: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});
export type UpdateBusRequest = z.infer<typeof UpdateBusSchema>;

export interface BusResponse {
  id: string;
  agency_id: string;
  number_plate: string;
  model: string | null;
  capacity: number | null;
  is_active: boolean;
  added_by: string;
  added_by_name?: string | null;
  created_at: string;
}

export const CreateAgencyMemberSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
  role: z.enum(['conductor', 'driver']),
  password: z.string().min(6).max(255),
});
export type CreateAgencyMemberRequest = z.infer<typeof CreateAgencyMemberSchema>;

export const ToggleAgencyMemberSchema = z.object({
  is_active: z.boolean().optional(),
});
export type ToggleAgencyMemberRequest = z.infer<typeof ToggleAgencyMemberSchema>;

export interface AgencyMemberResponse {
  id: string;
  name: string;
  phone: string | null;
  role: 'conductor' | 'driver';
  is_active: boolean;
  added_by?: string | null;
  added_by_name?: string | null;
  trips_count?: number;
  last_active_at?: string | null;
  created_at: string;
}

export const AssignTripSchema = z.object({
  assigned_operator_id: z.string().uuid(),
});
export type AssignTripRequest = z.infer<typeof AssignTripSchema>;

export interface TripUnassignedNotification {
  tripId: string;
  tripName: string;
  previousOperatorName: string;
}

export interface TripAssignedNotification {
  tripId: string;
  tripName: string;
  assignedBy: string;
}
