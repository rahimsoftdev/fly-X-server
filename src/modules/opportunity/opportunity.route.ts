import { Router } from "express";
import {
    cancelReservation,
    createOpportunityController,
    getManageOpportunitiesController,
    getManageOpportunityByIdController,
    getMyOpportunities,
    getOpportunities,
    reserveOpportunity,
    updateOpportunityStatusController,
} from "./opportunity.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const opportunityRouter = Router();

// user-এর জন্য (আগের মতোই)
opportunityRouter.get("/", requireAuth, getOpportunities);
opportunityRouter.get("/my", requireAuth, getMyOpportunities);

// staff/admin (/:id-এর আগে থাকতে হবে)
opportunityRouter.get("/manage", requireAuth, getManageOpportunitiesController);
opportunityRouter.get(
    "/manage/:id",
    requireAuth,
    getManageOpportunityByIdController
);
opportunityRouter.post("/", requireAuth, createOpportunityController);
opportunityRouter.patch(
    "/:id/status",
    requireAuth,
    updateOpportunityStatusController
);

// user-এর জন্য (আগের মতোই)
opportunityRouter.post("/:id/reserve", requireAuth, reserveOpportunity);
opportunityRouter.delete("/:id/reserve", requireAuth, cancelReservation);

export default opportunityRouter;