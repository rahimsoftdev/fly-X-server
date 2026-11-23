import { isValidObjectId } from "mongoose";
import TravelPreference from "./travel-preference.model.js";
// import { isValidObjectId } from "mongoose";
// import { ServiceError } from "../../utils/service-error.util.js";
import { attachMembers } from "../../utils/member-lookup.util.js";
const DAYS = [
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
];
// Service theke controller-e error pathanor jonno
export class ServiceError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 1) Notun travel post toiri
export const createTravel = async (userId, body) => {
    const { type, origin, destination, preferredTime, dayOfWeek, date } = body ?? {};
    if (type !== "regular" && type !== "one-time") {
        throw new ServiceError(400, 'type must be "regular" or "one-time"');
    }
    if (typeof origin !== "string" ||
        !origin.trim() ||
        typeof destination !== "string" ||
        !destination.trim() ||
        typeof preferredTime !== "string" ||
        !preferredTime.trim()) {
        throw new ServiceError(400, "origin, destination and preferredTime are required");
    }
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
        throw new ServiceError(400, "origin and destination can't be the same");
    }
    const data = {
        type,
        origin,
        destination,
        preferredTime,
        creatorUserId: userId,
    };
    if (type === "regular") {
        const day = typeof dayOfWeek === "string" ? dayOfWeek.toLowerCase() : "";
        if (!DAYS.includes(day)) {
            throw new ServiceError(400, "A valid dayOfWeek is required for regular travel");
        }
        data.dayOfWeek = day;
    }
    else {
        const parsed = new Date(date);
        if (!date || Number.isNaN(parsed.getTime())) {
            throw new ServiceError(400, "A valid date is required for one-time travel");
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsed < today) {
            throw new ServiceError(400, "date can't be in the past");
        }
        data.date = parsed;
    }
    return TravelPreference.create(data);
};
// 2) Nijer post gulo
export const getMyTravels = async (userId) => {
    return TravelPreference.find({ creatorUserId: userId })
        .sort({ createdAt: -1 })
        .lean();
};
// 3) Nijer post delete (owner check shoho)
export const deleteTravel = async (userId, id) => {
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }
    const deleted = await TravelPreference.findOneAndDelete({
        _id: id,
        creatorUserId: userId,
    });
    if (!deleted) {
        throw new ServiceError(404, "Travel preference not found");
    }
    return deleted;
};
// 4) Sob post (pagination + filter)
export const getAllTravels = async (query) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const filter = {
        status: { $ne: "canceled" },
    };
    const { type, origin, destination } = query;
    if (type === "regular" || type === "one-time") {
        filter.type = type;
    }
    if (typeof origin === "string" && origin.trim()) {
        filter.origin = new RegExp(`^${escapeRegex(origin.trim())}$`, "i");
    }
    if (typeof destination === "string" && destination.trim()) {
        filter.destination = new RegExp(`^${escapeRegex(destination.trim())}$`, "i");
    }
    const [items, total] = await Promise.all([
        TravelPreference.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        TravelPreference.countDocuments(filter),
    ]);
    return {
        items,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
/* ============================================================
   Staff / Admin: manage section
============================================================ */
const TRAVEL_TYPES = ["regular", "one-time"];
const TRAVEL_STATUSES = ["interested", "confirmed", "canceled"];
const TRAVEL_MANAGE_ROLES = ["admin", "staff"];
const assertTravelStaff = (actor) => {
    if (!TRAVEL_MANAGE_ROLES.includes((actor.role ?? "").toLowerCase())) {
        throw new ServiceError(403, "You don't have permission to do this");
    }
};
const exactMatch = (value) => new RegExp(`^${escapeRegex(value.trim())}$`, "i");
// 1) Management table (canceled সহ, সব status)
export const getManageTravels = async (actor, query) => {
    assertTravelStaff(actor);
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const filter = {};
    const { type, status, origin, destination } = query;
    if (TRAVEL_TYPES.includes(type)) {
        filter.type = type;
    }
    if (TRAVEL_STATUSES.includes(status)) {
        filter.status = status;
    }
    if (typeof origin === "string" && origin.trim()) {
        filter.origin = exactMatch(origin);
    }
    if (typeof destination === "string" && destination.trim()) {
        filter.destination = exactMatch(destination);
    }
    const [items, total] = await Promise.all([
        TravelPreference.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        TravelPreference.countDocuments(filter),
    ]);
    return {
        items: await attachMembers(items),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
// 2) Details modal
export const getManageTravelById = async (actor, id) => {
    assertTravelStaff(actor);
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }
    const travel = await TravelPreference.findById(id).lean();
    if (!travel) {
        throw new ServiceError(404, "Travel preference not found");
    }
    const [withMember] = await attachMembers([travel]);
    return withMember;
};
// 3) "All Direction" dropdown
export const getManageTravelDirections = async (actor, type) => {
    assertTravelStaff(actor);
    const match = {};
    if (TRAVEL_TYPES.includes(type)) {
        match.type = type;
    }
    // বড়-ছোট হাতের লেখা একই direction ধরা হয়
    return TravelPreference.aggregate([
        { $match: match },
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
// 4) Status বদল (admin/staff)
export const updateManageTravelStatus = async (actor, id, status) => {
    assertTravelStaff(actor);
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }
    if (!TRAVEL_STATUSES.includes(status)) {
        throw new ServiceError(400, `status must be one of: ${TRAVEL_STATUSES.join(", ")}`);
    }
    const travel = await TravelPreference.findById(id);
    if (!travel) {
        throw new ServiceError(404, "Travel preference not found");
    }
    if (travel.status === status) {
        throw new ServiceError(400, `Already ${status}`);
    }
    travel.status = status;
    await travel.save();
    return travel;
};
//# sourceMappingURL=travel.service.js.map