import { Router } from "express";
import healthRouter from "./modules/health/health.router.js";
import opportunityRouter from "./modules/opportunity/opportunity.route.js";
import travelRouter from "./modules/travel-preference/trevel.router.js";
import customTravelRouter from "./modules/custom-travel-request/custom-travel-request.route.js";
import analyticsRouter from "./modules/analytics/analytics.route.js";
import dashboardRouter from "./modules/dashboard/dashboard.route.js";
import userRouter from "./modules/user/user.route.js";
const router = Router();
// Health Route
router.use("/health", healthRouter);
// opportunities base router:
router.use("/opportunities", opportunityRouter);
// travel base router:
router.use("/travel", travelRouter);
router.use("/custom-travel", customTravelRouter);
router.use("/analytics", analyticsRouter);
router.use("/dashboard", dashboardRouter);
router.use('/users', userRouter);
export default router;
//# sourceMappingURL=router.js.map