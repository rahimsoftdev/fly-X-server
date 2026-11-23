import { getAdminOverview, getInsights } from "./analytics.service.js";
export const getInsightsController = async (_req, res, next) => {
    try {
        const data = await getInsights();
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
};
export const getAdminOverviewController = async (req, res, next) => {
    try {
        const parsed = Number(req.query.year);
        const year = Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
            ? parsed
            : new Date().getFullYear();
        const data = await getAdminOverview(year);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=analytics.controller.js.map