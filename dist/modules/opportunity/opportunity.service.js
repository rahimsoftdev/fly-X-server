import Opportunity from "./opportunity.model.js";
import { isValidObjectId } from "mongoose";
import { ServiceError } from "../../utils/service-error.util.js";
import { attachMembers } from "../../utils/member-lookup.util.js";
export const OPPORTUNITY_STATUSES = [
    "draft",
    "open",
    "confirmed",
    "completed",
];
export const OPPORTUNITY_TYPES = ["one-way", "two-way"];
export const getOpportunitiesService = async ({ page, limit, status, type, }) => {
    const filter = {};
    if (status)
        filter.status = status;
    if (type)
        filter.type = type;
    const skip = (page - 1) * limit;
    const [opportunities, total] = await Promise.all([
        Opportunity.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Opportunity.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
        opportunities,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};
export class OpportunityError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
export const reserveOpportunityService = async (opportunityId, userId) => {
    if (!isValidObjectId(opportunityId)) {
        throw new OpportunityError("Invalid opportunity id", 400);
    }
    // শর্ত আর সিট বসানো একসাথে (atomic), তাই ওভারবুকিং হয় না
    const updated = await Opportunity.findOneAndUpdate({
        _id: opportunityId,
        status: "open",
        passengers: { $ne: userId },
        $expr: { $lt: [{ $size: "$passengers" }, "$totalCapacity"] },
    }, { $addToSet: { passengers: userId } }, { new: true }).lean();
    if (updated)
        return updated;
    // কিছু না মিললে কারণ খুঁজে ঠিক এরর দাও
    const opportunity = await Opportunity.findById(opportunityId).lean();
    if (!opportunity) {
        throw new OpportunityError("Opportunity not found", 404);
    }
    if (opportunity.status !== "open") {
        throw new OpportunityError("This opportunity is not open", 400);
    }
    if (opportunity.passengers.includes(userId)) {
        throw new OpportunityError("You already reserved this opportunity", 409);
    }
    throw new OpportunityError("No seats available", 409);
};
export const cancelReservationService = async (opportunityId, userId) => {
    if (!isValidObjectId(opportunityId)) {
        throw new OpportunityError("Invalid opportunity id", 400);
    }
    // শর্ত আর সরানো একসাথে (atomic): open + user আছে
    const updated = await Opportunity.findOneAndUpdate({ _id: opportunityId, status: "open", passengers: userId }, { $pull: { passengers: userId } }, { new: true }).lean();
    if (updated)
        return updated;
    const opportunity = await Opportunity.findById(opportunityId).lean();
    if (!opportunity)
        throw new OpportunityError("Opportunity not found", 404);
    if (!opportunity.passengers.includes(userId)) {
        throw new OpportunityError("You have not reserved this opportunity", 404);
    }
    throw new OpportunityError("Once confirmed, cancellation is not available", 400);
};
export const getMyOpportunitiesService = async (userId, page, limit, status) => {
    const filter = {
        passengers: userId,
    };
    if (status)
        filter.status = status;
    const skip = (page - 1) * limit;
    const [opportunities, total] = await Promise.all([
        Opportunity.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Opportunity.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
        opportunities,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};
/* ============================================================
   Staff / Admin: manage section
============================================================ */
const MANAGE_STATUSES = ["draft", "open", "confirmed", "completed"];
// নতুন বানানোর সময় শুধু এই দুটো status চলবে
const CREATE_STATUSES = ["open", "draft"];
// কোন status থেকে কোনটায় যাওয়া যাবে
const STATUS_TRANSITIONS = {
    draft: ["open"],
    open: ["draft", "confirmed"],
    confirmed: ["completed"],
    completed: [],
};
const MANAGE_PRIVILEGED_ROLES = ["admin", "staff"];
const MANAGE_DEFAULT_LIMIT = 10;
const MANAGE_MAX_LIMIT = 100;
const assertStaff = (actor) => {
    if (!MANAGE_PRIVILEGED_ROLES.includes((actor.role ?? "").toLowerCase())) {
        throw new ServiceError(403, "You don't have permission to do this");
    }
};
const escapeRegexManage = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const requireManageText = (value, field) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new ServiceError(400, `${field} is required`);
    }
    return value.trim();
};
// passengers হলো user id-র array, তাই booked seat = তার দৈর্ঘ্য
const getBookedSeats = (opp) => Array.isArray(opp.passengers) ? opp.passengers.length : 0;
const withSeatInfo = (opp) => {
    const totalSeats = Number(opp.totalCapacity) || 0;
    const bookedSeats = getBookedSeats(opp);
    return {
        ...opp,
        totalSeats,
        bookedSeats,
        availableSeats: Math.max(totalSeats - bookedSeats, 0),
    };
};
// 1) নতুন opportunity বানানো
// 1) নতুন opportunity বানানো
export const createOpportunityService = async (actor, body) => {
    assertStaff(actor);
    const { type = "one-way", origin, destination, preferredDeparture, returnOrigin, returnDestination, returnDate, price: rawPrice, aircraftType, totalCapacity, bookingSpeed, status, } = body ?? {};
    if (type !== "one-way" && type !== "two-way") {
        throw new ServiceError(400, 'type must be "one-way" or "two-way"');
    }
    if (!CREATE_STATUSES.includes(status)) {
        throw new ServiceError(400, `status must be one of: ${CREATE_STATUSES.join(", ")}`);
    }
    const cleanOrigin = requireManageText(origin, "origin");
    const cleanDestination = requireManageText(destination, "destination");
    if (cleanOrigin.toLowerCase() === cleanDestination.toLowerCase()) {
        throw new ServiceError(400, "origin and destination can't be the same");
    }
    const departure = new Date(preferredDeparture);
    if (!preferredDeparture || Number.isNaN(departure.getTime())) {
        throw new ServiceError(400, "A valid preferredDeparture is required");
    }
    // timezone-এর ঝামেলা এড়াতে আগের দিন পর্যন্ত গ্রহণ করা হয়
    const earliestAllowed = new Date();
    earliestAllowed.setUTCHours(0, 0, 0, 0);
    earliestAllowed.setUTCDate(earliestAllowed.getUTCDate() - 1);
    if (departure < earliestAllowed) {
        throw new ServiceError(400, "preferredDeparture can't be in the past");
    }
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) {
        throw new ServiceError(400, "price must be a valid number");
    }
    const capacity = Number(totalCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
        throw new ServiceError(400, "totalCapacity must be a whole number of at least 1");
    }
    // two-way হলে ফেরার তারিখ আর পথ
    const returnFields = {};
    if (type === "two-way") {
        const ret = new Date(returnDate);
        if (!returnDate || Number.isNaN(ret.getTime())) {
            throw new ServiceError(400, "A valid returnDate is required");
        }
        if (ret < departure) {
            throw new ServiceError(400, "returnDate can't be before preferredDeparture");
        }
        returnFields.returnDate = ret;
        // না পাঠালে ফেরার পথ = আগের পথ উল্টো
        returnFields.returnOrigin =
            typeof returnOrigin === "string" && returnOrigin.trim()
                ? returnOrigin.trim()
                : cleanDestination;
        returnFields.returnDestination =
            typeof returnDestination === "string" && returnDestination.trim()
                ? returnDestination.trim()
                : cleanOrigin;
    }
    return Opportunity.create({
        type,
        origin: cleanOrigin,
        destination: cleanDestination,
        preferredDeparture: departure,
        ...returnFields,
        price,
        aircraftType: requireManageText(aircraftType, "aircraftType"),
        totalCapacity: capacity,
        // UI form-এ নেই, তাই না পাঠালে default (আপনার প্রজেক্ট অনুযায়ী বদলান)
        bookingSpeed: typeof bookingSpeed === "string" && bookingSpeed.trim()
            ? bookingSpeed.trim()
            : "standard",
        status,
        creatorUserId: actor.id,
    });
};
// 2) Staff-এর management table
export const getManageOpportunitiesService = async (actor, query) => {
    assertStaff(actor);
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || MANAGE_DEFAULT_LIMIT, 1), MANAGE_MAX_LIMIT);
    const filter = {};
    const { status, origin, destination } = query;
    if (MANAGE_STATUSES.includes(status)) {
        filter.status = status;
    }
    if (typeof origin === "string" && origin.trim()) {
        filter.origin = new RegExp(`^${escapeRegexManage(origin.trim())}$`, "i");
    }
    if (typeof destination === "string" && destination.trim()) {
        filter.destination = new RegExp(`^${escapeRegexManage(destination.trim())}$`, "i");
    }
    const [items, total] = await Promise.all([
        Opportunity.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Opportunity.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
        items: items.map((item) => withSeatInfo(item)),
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};
// 3) Details page (traveler list সহ)
export const getManageOpportunityByIdService = async (actor, id) => {
    assertStaff(actor);
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }
    const opportunity = await Opportunity.findById(id).lean();
    if (!opportunity) {
        throw new ServiceError(404, "Opportunity not found");
    }
    const passengerIds = Array.isArray(opportunity.passengers)
        ? opportunity.passengers.map(String)
        : [];
    // attachMembers creatorUserId দিয়ে member খোঁজে, তাই সেই নামে দিলাম
    const travelers = (await attachMembers(passengerIds.map((pid) => ({ creatorUserId: pid })))).map((t) => ({
        userId: t.creatorUserId,
        member: t.member,
    }));
    return {
        ...withSeatInfo(opportunity),
        travelers,
    };
};
// 4) শুধু status বদল
export const updateOpportunityStatusService = async (actor, id, status) => {
    assertStaff(actor);
    if (!isValidObjectId(id)) {
        throw new ServiceError(400, "Invalid id");
    }
    if (!MANAGE_STATUSES.includes(status)) {
        throw new ServiceError(400, `status must be one of: ${MANAGE_STATUSES.join(", ")}`);
    }
    const nextStatus = status;
    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
        throw new ServiceError(404, "Opportunity not found");
    }
    const currentStatus = opportunity.status;
    if (currentStatus === nextStatus) {
        throw new ServiceError(400, `Opportunity is already ${nextStatus}`);
    }
    if (!STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
        throw new ServiceError(400, `Can't change status from ${currentStatus} to ${nextStatus}`);
    }
    // কেউ book করে ফেললে draft-এ ফেরানো যাবে না
    if (nextStatus === "draft" && getBookedSeats(opportunity) > 0) {
        throw new ServiceError(400, "Can't move to draft because seats are already booked");
    }
    opportunity.status = nextStatus;
    await opportunity.save();
    return opportunity;
};
//# sourceMappingURL=opportunity.service.js.map