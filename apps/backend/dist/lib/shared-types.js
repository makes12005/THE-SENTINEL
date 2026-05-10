"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignTripSchema = exports.ToggleAgencyMemberSchema = exports.CreateAgencyMemberSchema = exports.UpdateBusSchema = exports.CreateBusSchema = exports.ListTripsQuerySchema = exports.LocationUpdateSchema = exports.BoardingChecklistUpdateSchema = exports.ConfirmPassengersSchema = exports.PassengerUploadReviewRowSchema = exports.PassengerRowSchema = exports.BatchAddPassengersSchema = exports.AddPassengerSchema = exports.CreateTemplateSchema = exports.CreateTripSchema = exports.CreateStopSchema = exports.CreatePopularRouteSchema = exports.PopularRouteStopSchema = exports.GeoLibraryCreateSchema = exports.CreateRouteSchema = exports.CoordinatesSchema = exports.BoardingStatusEnum = exports.RouteSourceEnum = exports.AlertChannelEnum = exports.AlertStatusEnum = exports.TripStatusEnum = exports.LoginRequestSchema = exports.PhoneSchema = exports.UserRole = void 0;
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
exports.RouteSourceEnum = zod_1.z.enum(['scratch', 'popular', 'library']);
exports.BoardingStatusEnum = zod_1.z.enum(['pending', 'boarded', 'absent']);
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
    is_published: zod_1.z.boolean().optional(),
    source: exports.RouteSourceEnum.optional(),
})
    .transform((data) => ({
    name: data.name,
    from_city: data.from_city ?? data.fromCity ?? '',
    to_city: data.to_city ?? data.toCity ?? '',
    is_published: data.is_published ?? false,
    source: data.source ?? 'scratch',
}))
    .refine((data) => Boolean(data.from_city && data.to_city), {
    message: 'from_city/to_city (or fromCity/toCity) is required',
});
exports.GeoLibraryCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
});
exports.PopularRouteStopSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    sequence: zod_1.z.number().int().positive(),
});
exports.CreatePopularRouteSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    from_city: zod_1.z.string().min(1).max(255),
    to_city: zod_1.z.string().min(1).max(255),
    stops: zod_1.z.array(exports.PopularRouteStopSchema).min(2),
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
    template_id: zod_1.z.string().uuid().optional(),
    templateId: zod_1.z.string().uuid().optional(),
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
    scheduled_time: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm').optional(),
    scheduledTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm').optional(),
})
    .transform((data) => ({
    template_id: data.template_id ?? data.templateId,
    route_id: data.route_id ?? data.routeId ?? '',
    conductor_id: data.conductor_id ?? data.conductorId ?? '',
    driver_id: data.driver_id ?? data.driverId,
    bus_id: data.bus_id ?? data.busId,
    assigned_operator_id: data.assigned_operator_id ?? data.assignedOperatorId,
    scheduled_date: data.scheduled_date ?? data.scheduledDate ?? '',
    scheduled_time: data.scheduled_time ?? data.scheduledTime,
}))
    .refine((data) => 
// Either template_id + scheduled_date OR all three manual fields
Boolean(data.template_id && data.scheduled_date) ||
    Boolean(data.route_id && data.conductor_id && data.scheduled_date), { message: 'route_id/conductor_id/scheduled_date are required (or template_id + scheduled_date)' });
exports.CreateTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    route_id: zod_1.z.string().uuid(),
    bus_id: zod_1.z.string().uuid().optional().nullable(),
    conductor_id: zod_1.z.string().uuid().optional().nullable(),
    driver_id: zod_1.z.string().uuid().optional().nullable(),
    departure_time: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm').optional().nullable(),
    arrival_time: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm').optional().nullable(),
    notes: zod_1.z.string().max(1000).optional().nullable(),
});
exports.AddPassengerSchema = zod_1.z.object({
    passenger_name: zod_1.z.string().min(1).max(255),
    passenger_phone: zod_1.z
        .string()
        .regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
    stop_id: zod_1.z.string().uuid(),
    pickup_point: zod_1.z.string().max(255).nullable().optional(),
    seat_no: zod_1.z.string().max(50).nullable().optional(),
});
exports.BatchAddPassengersSchema = zod_1.z.object({
    passengers: zod_1.z.array(exports.AddPassengerSchema).max(100),
});
exports.PassengerRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'name is required').max(255).nullable().optional(),
    phone: zod_1.z.string().nullable().optional(),
    stop_name: zod_1.z.string().nullable().optional(),
    pickup_point: zod_1.z.string().max(255).nullable().optional(),
    seat_no: zod_1.z.string().max(50).nullable().optional(),
});
exports.PassengerUploadReviewRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'name is required').max(255),
    phone: zod_1.z.string().regex(/^\+91\d{10}$/, 'Must be E.164 format (+91XXXXXXXXXX)'),
    stop_name: zod_1.z.string().min(1, 'stop_name is required'),
    pickup_point: zod_1.z.string().max(255).nullable().optional(),
    seat_no: zod_1.z.string().max(50).nullable().optional(),
});
exports.ConfirmPassengersSchema = zod_1.z.object({
    passengers: zod_1.z.array(exports.PassengerUploadReviewRowSchema).min(1),
});
exports.BoardingChecklistUpdateSchema = zod_1.z.object({
    passengers: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        boarding_status: exports.BoardingStatusEnum,
    })).min(1),
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
