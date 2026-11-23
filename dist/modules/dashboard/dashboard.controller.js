import { getDashboardOverview } from "./dashboard.service.js";
export const getDashboardOverviewController = async (_req, res, next) => {
    try {
        const { id, name } = res.locals.user;
        const data = await getDashboardOverview(id, name);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        console.error("dashboard overview error:", error);
        next(error);
    }
};
//# sourceMappingURL=dashboard.controller.js.map