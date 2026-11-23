import type { NextFunction, Request, Response } from "express";
import { getAllUsers, getTotalUserCount } from "./user.service.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// query থেকে সংখ্যা পড়া, ভুল হলে default
const toPositiveInt = (value: unknown, fallback: number) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// GET /api/users  (admin only)
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(
      toPositiveInt(req.query.limit, DEFAULT_LIMIT),
      MAX_LIMIT
    );

    const data = await getAllUsers(page, limit);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/count  (public)
export const userCount = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalUsers = await getTotalUserCount();

    res.status(200).json({ success: true, data: { totalUsers } });
  } catch (error) {
    next(error);
  }
};