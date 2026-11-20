import { Router } from "express";
import { cancelReservation, getMyOpportunities, getOpportunities, reserveOpportunity } from "./opportunity.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const opportunityRouter = Router();

opportunityRouter.get("/",requireAuth, getOpportunities);
opportunityRouter.get("/my", requireAuth, getMyOpportunities);
opportunityRouter.post("/:id/reserve", requireAuth, reserveOpportunity);
opportunityRouter.delete("/:id/reserve", requireAuth, cancelReservation);
export default opportunityRouter;