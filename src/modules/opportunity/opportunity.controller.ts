import type { Request, Response } from "express";
import {
    getOpportunitiesService,
    OPPORTUNITY_STATUSES,
    OPPORTUNITY_TYPES,
    type OpportunityStatus,
    type OpportunityType,
} from "./opportunity.service.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

const toPositiveInt = (value: unknown, fallback: number) => {
    const num = Number(value);
    return Number.isInteger(num) && num > 0 ? num : fallback;
};

export const getOpportunities = async (req: Request, res: Response) => {
    try {
        const { status, type } = req.query;

        const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
        const limit = Math.min(
            toPositiveInt(req.query.limit, DEFAULT_LIMIT),
            MAX_LIMIT
        );

        if (
            status !== undefined &&
            !OPPORTUNITY_STATUSES.includes(status as OpportunityStatus)
        ) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed: ${OPPORTUNITY_STATUSES.join(", ")}`,
            });
        }

        if (
            type !== undefined &&
            !OPPORTUNITY_TYPES.includes(type as OpportunityType)
        ) {
            return res.status(400).json({
                success: false,
                message: `Invalid type. Allowed: ${OPPORTUNITY_TYPES.join(", ")}`,
            });
        }

        const result = await getOpportunitiesService({
            page,
            limit,
            status: status as OpportunityStatus | undefined,
            type: type as OpportunityType | undefined,
        });

        return res.status(200).json({
            success: true,
            data: result.opportunities,
            meta: result.meta,
        });
    } catch (error) {
        console.error("getOpportunities error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch opportunities",
        });
    }
};