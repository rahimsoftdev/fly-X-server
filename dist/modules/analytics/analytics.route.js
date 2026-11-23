import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { getAdminOverviewController, getInsightsController, } from "./analytics.controller.js";
const analyticsRouter = Router();
analyticsRouter.use(requireAuth);
// Staff + Admin
analyticsRouter.get("/insights", requireRole("admin", "staff"), getInsightsController);
// শুধু Admin
analyticsRouter.get("/admin-overview", requireRole("admin"), getAdminOverviewController);
export default analyticsRouter;
//# sourceMappingURL=analytics.route.js.map