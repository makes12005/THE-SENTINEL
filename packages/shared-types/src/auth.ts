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
  }
}

export interface JWTPayload {
  id: string;
  role: UserRole;
  agency_id: string | null;
  name: string;
}
