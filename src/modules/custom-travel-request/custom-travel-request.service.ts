import { isValidObjectId } from "mongoose";
import { ServiceError } from "../../utils/service-error.util.js";
import CustomTravelRequest from "./custom-travel-request.model.js";

const TRIP_TYPES = ["one-way", "two-way"] as const;
const STATUSES = ["interested", "confirmed"] as const;
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
] as const;

// Je manush request korche (JWT theke ashe)
export interface Actor {
    id: string;
    role: string;
}

export const isPrivileged = (role?: string) =>
    PRIVILEGED_ROLES.includes((role ?? "").toLowerCase());

// admin/staff hole shudhu _id, user hole _id + nijer creatorUserId
const accessFilter = (actor: Actor, id: string) =>
    isPrivileged(actor.role)
        ? { _id: id }
        : { _id: id, creatorUserId: actor.id };

const escapeRegex = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireText = (value: unknown, field: string) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new ServiceError(400, `${field} is required`);
    }
    return value.trim();
};

const parseDate = (value: unknown, field: string) => {
    const date = new Date(value as string);
    if (!value || Number.isNaN(date.getTime())) {
        throw new ServiceError(400, `A valid ${field} is required`);
    }
    return date;
};

const parsePassengers = (value: unknown) => {
    if (!Array.isArray(value) || value.length === 0) {
        throw new ServiceError(400, "At least one passenger is required");
    }
    if (value.length > MAX_PASSENGERS) {
        throw new ServiceError(
            400,
            `You can add at most ${MAX_PASSENGERS} passengers`
        );
    }

    return value.map((passenger: any, index: number) => {
        const clean = {} as Record<(typeof PASSENGER_FIELDS)[number], string>;

        for (const field of PASSENGER_FIELDS) {
            const v = passenger?.[field];
            if (typeof v !== "string" || !v.trim()) {
                throw new ServiceError(
                    400,
                    `Passenger ${index + 1}: ${field} is required`
                );
            }
            clean[field] = v.trim();
        }

        if (!EMAIL_REGEX.test(clean.email)) {
            throw new ServiceError(
                400,
                `Passenger ${index + 1}: email is not valid`
            );
        }

        return clean;
    });
};

// 1) Notun custom travel request
export const createCustomTravel = async (userId: string, body: any) => {
    const {
        type,
        origin,
        destination,
        preferredDeparture,
        specialRequests,
        passengers,
        returnOrigin,
        returnDestination,
        returnDate,
    } = body ?? {};

    if (!(TRIP_TYPES as readonly string[]).includes(type)) {
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

    const data: Record<string, unknown> = {
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
            throw new ServiceError(
                400,
                `specialRequests can't be longer than ${MAX_SPECIAL_REQUEST_LENGTH} characters`
            );
        }
        if (specialRequests.trim()) {
            data.specialRequests = specialRequests.trim();
        }
    }

    if (type === "two-way") {
        const ret = parseDate(returnDate, "returnDate");
        if (ret < departure) {
            throw new ServiceError(
                400,
                "returnDate can't be before preferredDeparture"
            );
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
export const getMyCustomTravels = async (userId: string) => {
    return CustomTravelRequest.find({ creatorUserId: userId })
        .sort({ createdAt: -1 })
        .lean();
};

// 3) Sob request (shudhu admin/staff, karon passenger-er email/phone ache)
export const getAllCustomTravels = async (
    actor: Actor,
    query: Record<string, unknown>
) => {
    if (!isPrivileged(actor.role)) {
        throw new ServiceError(403, "You don't have permission to do this");
    }

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

    const filter: Record<string, unknown> = {};
    const { type, status, origin, destination } = query;

    if ((TRIP_TYPES as readonly string[]).includes(type as string)) {
        filter.type = type;
    }
    if ((STATUSES as readonly string[]).includes(status as string)) {
        filter.status = status;
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
        CustomTravelRequest.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        CustomTravelRequest.countDocuments(filter),
    ]);

    return {
        items,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

// 4) Delete: admin/staff je kono ta, user shudhu nijerta
export const deleteCustomTravel = async (actor: Actor, id: string) => {
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }

    const deleted = await CustomTravelRequest.findOneAndDelete(
        accessFilter(actor, id)
    );

    if (!deleted) {
        throw new ServiceError(404, "Custom travel request not found");
    }

    return deleted;
};

// 5) Status edit: admin/staff je kono ta, user shudhu nijerta
export const updateCustomTravelStatus = async (
    actor: Actor,
    id: string,
    status: unknown
) => {
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }

    if (!(STATUSES as readonly string[]).includes(status as string)) {
        throw new ServiceError(
            400,
            `status must be one of: ${STATUSES.join(", ")}`
        );
    }

    const updated = await CustomTravelRequest.findOneAndUpdate(
        accessFilter(actor, id),
        { status },
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw new ServiceError(404, "Custom travel request not found");
    }

    return updated;
};