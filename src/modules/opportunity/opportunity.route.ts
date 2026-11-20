import { Router } from "express";
import { getOpportunities } from "./opportunity.controller.js";

const opportunityRouter = Router();

opportunityRouter.get("/", getOpportunities);

export default opportunityRouter;