import Opportunity from "./opportunity.model.js";
import type { IOpportunity } from "./opportunity.types.js";
import { isValidObjectId } from "mongoose";

export type OpportunityStatus = IOpportunity["status"];
export type OpportunityType = IOpportunity["type"];

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  "draft",
  "open",
  "confirmed",
  "completed",
];

export const OPPORTUNITY_TYPES: OpportunityType[] = ["one-way", "two-way"];

export interface GetOpportunitiesParams {
  page: number;
  limit: number;
  status?: OpportunityStatus | undefined;
  type?: OpportunityType | undefined;
}

export const getOpportunitiesService = async ({
  page,
  limit,
  status,
  type,
}: GetOpportunitiesParams) => {
  const filter: { status?: OpportunityStatus; type?: OpportunityType } = {};

  if (status) filter.status = status;
  if (type) filter.type = type;

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
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const reserveOpportunityService = async (
  opportunityId: string,
  userId: string
) => {
  if (!isValidObjectId(opportunityId)) {
    throw new OpportunityError("Invalid opportunity id", 400);
  }

  // শর্ত আর সিট বসানো একসাথে (atomic), তাই ওভারবুকিং হয় না
  const updated = await Opportunity.findOneAndUpdate(
    {
      _id: opportunityId,
      status: "open",
      passengers: { $ne: userId },
      $expr: { $lt: [{ $size: "$passengers" }, "$totalCapacity"] },
    },
    { $addToSet: { passengers: userId } },
    { new: true }
  ).lean();

  if (updated) return updated;

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
export const cancelReservationService = async (
  opportunityId: string,
  userId: string
) => {
  if (!isValidObjectId(opportunityId)) {
    throw new OpportunityError("Invalid opportunity id", 400);
  }

  // শর্ত আর সরানো একসাথে (atomic): open + user আছে
  const updated = await Opportunity.findOneAndUpdate(
    { _id: opportunityId, status: "open", passengers: userId },
    { $pull: { passengers: userId } },
    { new: true }
  ).lean();

  if (updated) return updated;

  const opportunity = await Opportunity.findById(opportunityId).lean();
  if (!opportunity) throw new OpportunityError("Opportunity not found", 404);
  if (!opportunity.passengers.includes(userId)) {
    throw new OpportunityError("You have not reserved this opportunity", 404);
  }
  throw new OpportunityError(
    "Once confirmed, cancellation is not available",
    400
  );
};

export const getMyOpportunitiesService = async (
  userId: string,
  page: number,
  limit: number,
  status?: OpportunityStatus | undefined
) => {
  const filter: { passengers: string; status?: OpportunityStatus } = {
    passengers: userId,
  };
  if (status) filter.status = status;
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