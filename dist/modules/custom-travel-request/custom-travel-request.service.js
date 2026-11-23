import { isValidObjectId } from "mongoose";
import { ServiceError } from "../../utils/service-error.util.js";
// import { attachMembers } from "../../utils/member-lookup.util.js";
import CustomTravelRequest from "./custom-travel-request.model.js";
import { attachMembers } from "../../utils/member-lookup.util.js";
const TRIP_TYPES = ["one-way", "two-way"];
const STATUSES = ["interested", "confirmed"];
const PRIVILEGED_ROLES = ["admin", "staff"];
const MAX_PASSENGERS = 20;
const MAX_SPECIAL_REQUEST_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSENGER_FIELDS = [
    "firstName",
    "lastName",
    "streetAddress",
    "zipCode",
    "email",
    "phone",
];
export const isPrivileged = (role) => PRIVILEGED_ROLES.includes((role ?? "").toLowerCase());
// admin/staff hole shudhu _id, user hole _id + nijer creatorUserId
const accessFilter = (actor, id) => isPrivileged(actor.role)
    ? { _id: id }
    : { _id: id, creatorUserId: actor.id };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const requireText = (value, field) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new ServiceError(400, `${field} is required`);
    }
    return value.trim();
};
const parseDate = (value, field) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
        throw new ServiceError(400, `A valid ${field} is required`);
    }
    return date;
};
const parsePassengers = (value) => {
    if (!Array.isArray(value) || value.length === 0) {
        throw new ServiceError(400, "At least one passenger is required");
    }
    if (value.length > MAX_PASSENGERS) {
        throw new ServiceError(400, `You can add at most ${MAX_PASSENGERS} passengers`);
    }
    return value.map((passenger, index) => {
        const clean = {};
        for (const field of PASSENGER_FIELDS) {
            const v = passenger?.[field];
            if (typeof v !== "string" || !v.trim()) {
                throw new ServiceError(400, `Passenger ${index + 1}: ${field} is required`);
            }
            clean[field] = v.trim();
        }
        if (!EMAIL_REGEX.test(clean.email)) {
            throw new ServiceError(400, `Passenger ${index + 1}: email is not valid`);
        }
        return clean;
    });
};
// 1) Notun custom travel request
export const createCustomTravel = async (userId, body) => {
    const { type, origin, destination, preferredDeparture, specialRequests, passengers, returnOrigin, returnDestination, returnDate, } = body ?? {};
    if (!TRIP_TYPES.includes(type)) {
        throw new ServiceError(400, 'type must be "one-way" or "two-way"');
    }
    const cleanOrigin = requireText(origin, "origin");
    const cleanDestination = requireText(destination, "destination");
    if (cleanOrigin.toLowerCase() === cleanDestination.toLowerCase()) {
        throw new ServiceError(400, "origin and destination can't be the same");
    }
    const departure = parseDate(preferredDeparture, "preferredDeparture");
    // timezone-er jhamela eriye chola-r jonno ager dinta porjonto grohon kora hoy
    const earliestAllowed = new Date();
    earliestAllowed.setUTCHours(0, 0, 0, 0);
    earliestAllowed.setUTCDate(earliestAllowed.getUTCDate() - 1);
    if (departure < earliestAllowed) {
        throw new ServiceError(400, "preferredDeparture can't be in the past");
    }
    const data = {
        type,
        origin: cleanOrigin,
        destination: cleanDestination,
        preferredDeparture: departure,
        passengers: parsePassengers(passengers),
        creatorUserId: userId,
    };
    if (specialRequests !== undefined && specialRequests !== null) {
        if (typeof specialRequests !== "string") {
            throw new ServiceError(400, "specialRequests must be text");
        }
        if (specialRequests.trim().length > MAX_SPECIAL_REQUEST_LENGTH) {
            throw new ServiceError(400, `specialRequests can't be longer than ${MAX_SPECIAL_REQUEST_LENGTH} characters`);
        }
        if (specialRequests.trim()) {
            data.specialRequests = specialRequests.trim();
        }
    }
    if (type === "two-way") {
        const ret = parseDate(returnDate, "returnDate");
        if (ret < departure) {
            throw new ServiceError(400, "returnDate can't be before preferredDeparture");
        }
        data.returnDate = ret;
        // na pathale ferar poth = ager poth ulte
        data.returnOrigin =
            typeof returnOrigin === "string" && returnOrigin.trim()
                ? returnOrigin.trim()
                : cleanDestination;
        data.returnDestination =
            typeof returnDestination === "string" && returnDestination.trim()
                ? returnDestination.trim()
                : cleanOrigin;
    }
    return CustomTravelRequest.create(data);
};
// 2) Nijer request gulo
export const getMyCustomTravels = async (userId) => {
    return CustomTravelRequest.find({ creatorUserId: userId })
        .sort({ createdAt: -1 })
        .lean();
};
// 3) Sob request (shudhu admin/staff, karon passenger-er email/phone ache)
export const getAllCustomTravels = async (actor, query) => {
    if (!isPrivileged(actor.role)) {
        throw new ServiceError(403, "You don't have permission to do this");
    }
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const filter = {};
    const { type, status, origin, destination } = query;
    if (TRIP_TYPES.includes(type)) {
        filter.type = type;
    }
    if (STATUSES.includes(status)) {
        filter.status = status;
    }
    if (typeof origin === "string" && origin.trim()) {
        filter.origin = new RegExp(`^${escapeRegex(origin.trim())}$`, "i");
    }
    if (typeof destination === "string" && destination.trim()) {
        filter.destination = new RegExp(`^${escapeRegex(destination.trim())}$`, "i");
    }
    const [items, total] = await Promise.all([
        CustomTravelRequest.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        CustomTravelRequest.countDocuments(filter),
    ]);
    return {
        // prottek request-er sathe member (name + email) jure dilam
        items: await attachMembers(items),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
// Ekta request-er details (member + passenger shoho).
// admin/staff je kono ta dekhte pare, user shudhu nijerta
export const getCustomTravelById = async (actor, id) => {
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }
    const travel = await CustomTravelRequest.findOne(accessFilter(actor, id)).lean();
    if (!travel) {
        throw new ServiceError(404, "Custom travel request not found");
    }
    const [withMember] = await attachMembers([travel]);
    return withMember;
};
// Filter dropdown-er jonno alada alada direction (shudhu admin/staff)
export const getCustomTravelDirections = async (actor) => {
    if (!isPrivileged(actor.role)) {
        throw new ServiceError(403, "You don't have permission to do this");
    }
    // boro-choto hater lekha ek-i direction ek-i dhora hoy
    return CustomTravelRequest.aggregate([
        {
            $group: {
                _id: {
                    o: { $toLower: "$origin" },
                    d: { $toLower: "$destination" },
                },
                origin: { $first: "$origin" },
                destination: { $first: "$destination" },
            },
        },
        { $sort: { origin: 1, destination: 1 } },
        { $project: { _id: 0, origin: 1, destination: 1 } },
    ]);
};
// Delete: admin/staff je kono ta, user shudhu nijerta
export const deleteCustomTravel = async (actor, id) => {
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }
    const deleted = await CustomTravelRequest.findOneAndDelete(accessFilter(actor, id));
    if (!deleted) {
        throw new ServiceError(404, "Custom travel request not found");
    }
    return deleted;
};
// 5) Status edit: admin/staff je kono ta, user shudhu nijerta
export const updateCustomTravelStatus = async (actor, id, status) => {
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }
    if (!STATUSES.includes(status)) {
        throw new ServiceError(400, `status must be one of: ${STATUSES.join(", ")}`);
    }
    const updated = await CustomTravelRequest.findOneAndUpdate(accessFilter(actor, id), { status }, { new: true, runValidators: true });
    if (!updated) {
        throw new ServiceError(404, "Custom travel request not found");
    }
    return updated;
};
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CALENDAR_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;
// "YYYY-MM-DD" -> UTC-র ওই দিনের শুরু (00:00)
const parseDay = (value, field) => {
    if (typeof value !== "string" || !DATE_REGEX.test(value)) {
        throw new ServiceError(400, `${field} must be in YYYY-MM-DD format`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    // 2026-02-31 এর মতো ভুয়া তারিখ ধরার জন্য
    if (Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value) {
        throw new ServiceError(400, `A valid ${field} is required`);
    }
    return date;
};
const resolveStatus = (status) => STATUSES.includes(status)
    ? status
    : "interested";
// 6) Calendar-এর cell গুলোর summary (শুধু admin/staff)
export const getCalendarSummary = async (actor, query) => {
    if (!isPrivileged(actor.role)) {
        throw new ServiceError(403, "You don't have permission to do this");
    }
    const start = parseDay(query.from, "from");
    const lastDay = parseDay(query.to, "to");
    if (lastDay < start) {
        throw new ServiceError(400, "to can't be before from");
    }
    const days = (lastDay.getTime() - start.getTime()) / DAY_MS + 1;
    if (days > MAX_CALENDAR_RANGE_DAYS) {
        throw new ServiceError(400, `Date range can't be longer than ${MAX_CALENDAR_RANGE_DAYS} days`);
    }
    // to-র দিনটাও ধরার জন্য পরের দিনের 00:00 পর্যন্ত (exclusive)
    const endExclusive = new Date(lastDay.getTime() + DAY_MS);
    const status = resolveStatus(query.status);
    const items = await CustomTravelRequest.aggregate([
        {
            $match: {
                status,
                preferredDeparture: { $gte: start, $lt: endExclusive },
            },
        },
        // দিন + direction ধরে group (বড়-ছোট হাতের লেখা এক ধরা হয়)
        {
            $group: {
                _id: {
                    day: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$preferredDeparture",
                            timezone: "UTC",
                        },
                    },
                    o: { $toLower: "$origin" },
                    d: { $toLower: "$destination" },
                },
                origin: { $first: "$origin" },
                destination: { $first: "$destination" },
                count: { $sum: 1 },
            },
        },
        { $sort: { origin: 1, destination: 1 } },
        // এবার শুধু দিন ধরে group, direction গুলো array হবে
        {
            $group: {
                _id: "$_id.day",
                count: { $sum: "$count" },
                directions: {
                    $push: {
                        origin: "$origin",
                        destination: "$destination",
                        count: "$count",
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", count: 1, directions: 1 } },
    ]);
    return { items };
};
// 7) একটা নির্দিষ্ট দিনের interested list (শুধু admin/staff)
export const getCalendarDayDetails = async (actor, date, statusInput) => {
    if (!isPrivileged(actor.role)) {
        throw new ServiceError(403, "You don't have permission to do this");
    }
    const start = parseDay(date, "date");
    const end = new Date(start.getTime() + DAY_MS);
    const status = resolveStatus(statusInput);
    const travels = await CustomTravelRequest.find({
        status,
        preferredDeparture: { $gte: start, $lt: end },
    })
        .sort({ createdAt: -1 })
        .lean();
    // উপরের দুই box-এর জন্য direction অনুযায়ী count
    const directionMap = new Map();
    for (const t of travels) {
        const key = `${t.origin.toLowerCase()}|${t.destination.toLowerCase()}`;
        const existing = directionMap.get(key);
        if (existing) {
            existing.count += 1;
        }
        else {
            directionMap.set(key, {
                origin: t.origin,
                destination: t.destination,
                count: 1,
            });
        }
    }
    const withMembers = await attachMembers(travels);
    return {
        date: start.toISOString().slice(0, 10),
        total: travels.length,
        directions: [...directionMap.values()],
        // list-এ পুরো passengers পাঠাচ্ছি না, শুধু সংখ্যা
        items: withMembers.map(({ passengers, ...rest }) => ({
            ...rest,
            passengerCount: passengers?.length ?? 0,
        })),
    };
};
//# sourceMappingURL=custom-travel-request.service.js.map