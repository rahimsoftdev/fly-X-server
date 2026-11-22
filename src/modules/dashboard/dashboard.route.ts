import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getDashboardOverviewController } from "./dashboard.controller.js";

const dashboardRouter = Router();

// লগইন করা যেকোনো user (role check লাগবে না)
dashboardRouter.use(requireAuth);

dashboardRouter.get("/overview", getDashboardOverviewController);

export default dashboardRouter;