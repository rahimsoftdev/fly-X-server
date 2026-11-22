import type { NextFunction, Request, Response } from "express";
import { getDashboardOverview } from "./dashboard.service.js";

export const getDashboardOverviewController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, name } = res.locals.user as { id: string; name: string };
    const data = await getDashboardOverview(id, name);

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("dashboard overview error:", error);
    next(error);
  }
};