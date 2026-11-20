import Opportunity from "./opportunity.model.js";
import type { IOpportunity } from "./opportunity.types.js";

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