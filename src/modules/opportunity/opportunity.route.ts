import { Router } from "express";
import { getMyOpportunities, getOpportunities, reserveOpportunity } from "./opportunity.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const opportunityRouter = Router();

opportunityRouter.get("/", getOpportunities);
opportunityRouter.get("/my", requireAuth, getMyOpportunities);
opportunityRouter.post("/:id/reserve", requireAuth, reserveOpportunity);

export default opportunityRouter;