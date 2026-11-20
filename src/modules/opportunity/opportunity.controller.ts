import type { Request, Response } from "express";
import {
  cancelReservationService,
  getMyOpportunitiesService,
  getOpportunitiesService,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  OpportunityError,
  reserveOpportunityService,
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


export const reserveOpportunity = async (req: Request, res: Response) => {
  try {
    const userId: string = res.locals.user.id; // সেশন থেকে, ফ্রন্টএন্ড থেকে না
    const id = String(req.params.id);

    const opportunity = await reserveOpportunityService(id, userId);

    return res.status(200).json({
      success: true,
      message: "Reservation placed successfully",
      data: opportunity,
    });
  } catch (error) {
    if (error instanceof OpportunityError) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }
    console.error("reserveOpportunity error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place reservation",
    });
  }
};

export const getMyOpportunities = async (req: Request, res: Response) => {
  try {
    const userId: string = res.locals.user.id;
    const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(
      toPositiveInt(req.query.limit, DEFAULT_LIMIT),
      MAX_LIMIT
    );

    const { status } = req.query;

    // status দিলে সেটা বৈধ কিনা দেখো (open বা confirmed...)
    if (
      status !== undefined &&
      !OPPORTUNITY_STATUSES.includes(status as OpportunityStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${OPPORTUNITY_STATUSES.join(", ")}`,
      });
    }

    const result = await getMyOpportunitiesService(
      userId,
      page,
      limit,
      status as OpportunityStatus | undefined
    );

    return res.status(200).json({
      success: true,
      data: result.opportunities,
      meta: result.meta,
    });
  } catch (error) {
    console.error("getMyOpportunities error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your opportunities",
    });
  }
};

export const cancelReservation = async (req: Request, res: Response) => {
  try {
    const userId: string = res.locals.user.id; // সেশন/JWT থেকে
    const id = String(req.params.id);

    const opportunity = await cancelReservationService(id, userId);

    return res.status(200).json({
      success: true,
      message: "Reservation cancelled successfully",
      data: opportunity,
    });
  } catch (error) {
    if (error instanceof OpportunityError) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }
    console.error("cancelReservation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel reservation",
    });
  }
};