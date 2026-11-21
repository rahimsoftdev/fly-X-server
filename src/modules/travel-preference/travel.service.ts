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
] as const;

// Service theke controller-e error pathanor jonno
export class ServiceError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

const escapeRegex = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1) Notun travel post toiri
export const createTravel = async (userId: string, body: any) => {
    const { type, origin, destination, preferredTime, dayOfWeek, date } =
        body ?? {};

    if (type !== "regular" && type !== "one-time") {
        throw new ServiceError(400, 'type must be "regular" or "one-time"');
    }

    if (
        typeof origin !== "string" ||
        !origin.trim() ||
        typeof destination !== "string" ||
        !destination.trim() ||
        typeof preferredTime !== "string" ||
        !preferredTime.trim()
    ) {
        throw new ServiceError(
            400,
            "origin, destination and preferredTime are required"
        );
    }

    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
        throw new ServiceError(400, "origin and destination can't be the same");
    }

    const data: Record<string, unknown> = {
        type,
        origin,
        destination,
        preferredTime,
        creatorUserId: userId,
    };

    if (type === "regular") {
        const day = typeof dayOfWeek === "string" ? dayOfWeek.toLowerCase() : "";
        if (!DAYS.includes(day as (typeof DAYS)[number])) {
            throw new ServiceError(
                400,
                "A valid dayOfWeek is required for regular travel"
            );
        }
        data.dayOfWeek = day;
    } else {
        const parsed = new Date(date);
        if (!date || Number.isNaN(parsed.getTime())) {
            throw new ServiceError(
                400,
                "A valid date is required for one-time travel"
            );
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
export const getMyTravels = async (userId: string) => {
    return TravelPreference.find({ creatorUserId: userId })
        .sort({ createdAt: -1 })
        .lean();
};

// 3) Nijer post delete (owner check shoho)
export const deleteTravel = async (userId: string, id: string) => {
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
export const getAllTravels = async (query: Record<string, unknown>) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

    const filter: Record<string, unknown> = {
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
        filter.destination = new RegExp(
            `^${escapeRegex(destination.trim())}$`,
            "i"
        );
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

const TRAVEL_TYPES = ["regular", "one-time"] as const;
const TRAVEL_STATUSES = ["interested", "confirmed", "canceled"] as const;
const TRAVEL_MANAGE_ROLES = ["admin", "staff"];

export interface TravelActor {
    id: string;
    role: string;
}

const assertTravelStaff = (actor: TravelActor) => {
    if (!TRAVEL_MANAGE_ROLES.includes((actor.role ?? "").toLowerCase())) {
        throw new ServiceError(403, "You don't have permission to do this");
    }
};

const exactMatch = (value: string) =>
    new RegExp(`^${escapeRegex(value.trim())}$`, "i");

// 1) Management table (canceled সহ, সব status)
export const getManageTravels = async (
    actor: TravelActor,
    query: Record<string, unknown>
) => {
    assertTravelStaff(actor);

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);

    const filter: Record<string, unknown> = {};
    const { type, status, origin, destination } = query;

    if ((TRAVEL_TYPES as readonly string[]).includes(type as string)) {
        filter.type = type;
    }
    if ((TRAVEL_STATUSES as readonly string[]).includes(status as string)) {
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
export const getManageTravelById = async (actor: TravelActor, id: string) => {
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
export const getManageTravelDirections = async (
    actor: TravelActor,
    type?: unknown
) => {
    assertTravelStaff(actor);

    const match: Record<string, unknown> = {};
    if ((TRAVEL_TYPES as readonly string[]).includes(type as string)) {
        match.type = type;
    }

    // বড়-ছোট হাতের লেখা একই direction ধরা হয়
    return TravelPreference.aggregate<{ origin: string; destination: string }>([
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
export const updateManageTravelStatus = async (
    actor: TravelActor,
    id: string,
    status: unknown
) => {
    assertTravelStaff(actor);

    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }

    if (!(TRAVEL_STATUSES as readonly string[]).includes(status as string)) {
        throw new ServiceError(
            400,
            `status must be one of: ${TRAVEL_STATUSES.join(", ")}`
        );
    }

    const travel = await TravelPreference.findById(id);
    if (!travel) {
        throw new ServiceError(404, "Travel preference not found");
    }

    if (travel.status === status) {
        throw new ServiceError(400, `Already ${status}`);
    }

    travel.status = status as (typeof TRAVEL_STATUSES)[number];
    await travel.save();

    return travel;
};