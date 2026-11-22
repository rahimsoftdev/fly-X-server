import { Router } from "express";

import healthRouter from "./modules/health/health.router.js";
import opportunityRouter from "./modules/opportunity/opportunity.route.js";
import travelRouter from "./modules/travel-preference/trevel.router.js";
import customTravelRouter from "./modules/custom-travel-request/custom-travel-request.route.js";
import analyticsRouter from "./modules/analytics/analytics.route.js";

const router = Router();


// Health Route
router.use("/health", healthRouter);

// opportunities base router:
router.use("/opportunities", opportunityRouter);

// travel base router:
router.use("/travel", travelRouter);
router.use("/custom-travel", customTravelRouter);
router.use("/analytics", analyticsRouter);

export default router;