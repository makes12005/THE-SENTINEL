"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignTripSchema = exports.ToggleAgencyMemberSchema = exports.CreateAgencyMemberSchema = exports.UpdateBusSchema = exports.CreateBusSchema = exports.ListTripsQuerySchema = exports.LocationUpdateSchema = exports.PassengerRowSchema = exports.AddPassengerSchema = exports.CreateTripSchema = exports.CreateStopSchema = exports.CreateRouteSchema = exports.CoordinatesSchema = exports.AlertChannelEnum = exports.AlertStatusEnum = exports.TripStatusEnum = exports.LoginRequestSchema = exports.PhoneSchema = exports.UserRole = void 0;
const zod_1 = require("zod");
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["OWNER"] = "owner";
    UserRole["OPERATOR"] = "operator";
    UserRole["DRIVER"] = "driver";
    UserRole["CONDUCTOR"] = "conductor";
    UserRole["PASSENGER"] = "passenger";
})(UserRole || (exports.UserRole = UserRole = {}));
exports.PhoneSchema = zod_1.z
    .string()
    .regex(/^\+91\d{10}$/, 'Invalid phone number format, needs +91 and 10 digits');
exports.LoginRequestSchema = zod_1.z.object({
    phone: exports.PhoneSchema,
    password: zod_1.z.string().min(1),
});
exports.TripStatusEnum = zod_1.z.enum(['scheduled', 'active', 'completed']);
exports.AlertStatusEnum = zod_1.z.enum(['pending', 'sent', 'failed']);
exports.AlertChannelEnum = zod_1.z.enum(['call', 'sms', 'whatsapp', 'manual']);
exports.CoordinatesSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
});
exports.CreateRouteSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(255),
    fromCity: zod_1.z.string().min(1).max(255).optional(),
    from_city: zod_1.z.string().min(1).max(255).optional(),
    toCity: zod_1.z.string().min(1).max(255).optional(),
    to_city: zod_1.z.string().min(1).max(255).optional(),
})
    .transform((data) => ({
    name: data.name,
    from_city: data.from_city ?? data.fromCity ?? '',
    to_city: data.to_city ?? data.toCity ?? '',
}))
    .refine((data) => Boolean(data.from_city && data.to_city), {
    message: 'from_city/to_city (or fromCity/toCity) is required',
});
exports.CreateStopSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(255),
    sequence_number: zod_1.z.number().int().positive().optional(),
    sequenceNumber: zod_1.z.number().int().positive().optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    trigger_radius_km: zod_1.z.number().positive().optional(),
    triggerRadiusKm: zod_1.z.number().positive().optional(),
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
exports.CreateTripSchema = zod_1.z
    .object({
    route_id: zod_1.z.string().uuid().optional(),
    routeId: zod_1.z.string().uuid().optional(),
    conductor_id: zod_1.z.string().uuid().optional(),
    conductorId: zod_1.z.string().uuid().optional(),
    driver_id: zod_1.z.string().uuid().optional(),
    driverId: zod_1.z.string().uuid().optional(),
    bus_id: zod_1.z.string().uuid().optional(),
    busId: zod_1.z.string().uuid().optional(),
    assigned_operator_id: zod_1.z.string().uuid().nullable().optional(),
    assignedOperatorId: zod_1.z.string().uuid().nullable().optional(),
    scheduled_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    scheduledDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
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
exports.AddPassengerSchema = zod_1.z.object({
    passenger_name: zod_1.z.string().min(1).max(255),
    passenger_phone: zod_1.z
        .string()
        .regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
    stop_id: zod_1.z.string().uuid(),
});
exports.PassengerRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'name is required').max(255),
    phone: zod_1.z
        .string()
        .regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
    stop_name: zod_1.z.string().min(1, 'stop_name is required'),
});
exports.LocationUpdateSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    battery_level: zod_1.z.number().min(0).max(100).optional(),
    accuracy_meters: zod_1.z.number().positive().optional(),
});
exports.ListTripsQuerySchema = zod_1.z.object({
    status: exports.TripStatusEnum.optional(),
    unassigned: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.enum(['true', 'false'])])
        .optional()
        .transform((value) => value === true || value === 'true'),
});
exports.CreateBusSchema = zod_1.z.object({
    number_plate: zod_1.z.string().min(1).max(20).toUpperCase(),
    model: zod_1.z.string().min(1).max(255).optional(),
    capacity: zod_1.z.number().int().positive().optional(),
});
exports.UpdateBusSchema = zod_1.z.object({
    model: zod_1.z.string().min(1).max(255).optional(),
    capacity: zod_1.z.number().int().positive().optional(),
    is_active: zod_1.z.boolean().optional(),
});
exports.CreateAgencyMemberSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    phone: zod_1.z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
    role: zod_1.z.enum(['conductor', 'driver']),
    password: zod_1.z.string().min(6).max(255),
});
exports.ToggleAgencyMemberSchema = zod_1.z.object({
    is_active: zod_1.z.boolean().optional(),
});
exports.AssignTripSchema = zod_1.z.object({
    assigned_operator_id: zod_1.z.string().uuid(),
});
