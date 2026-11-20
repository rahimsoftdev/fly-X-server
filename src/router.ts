import { Router } from "express";

import healthRouter from "./modules/health/health.router.js";
// import customTravelRequestRouter from "./modules/custom-travel-request/custom-travel-request.route.js";
// import travelPreferenceRouter from "./modules/travel-preference/travel-preference.route.js";
import opportunityRouter from "./modules/opportunity/opportunity.route.js";

const router = Router();

// Health Route
router.use("/health", healthRouter);

// Module Routes
// router.use("/custom-travel-requests", customTravelRequestRouter);
// router.use("/travel-preferences", travelPreferenceRouter);
router.use("/opportunities", opportunityRouter);

export default router;