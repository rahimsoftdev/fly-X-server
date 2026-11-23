import type { NextFunction, Request, Response } from "express";
import { ApiError, deleteStaffById, getAllStaff, getAllUsers, getTotalUserCount, updateUserById } from "./user.service.js";
import type { IUpdateUserInput } from "./user.types.js";

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


/* ---------- Edit (admin) ---------- */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "address",
  "zipCode",
  "city",
  "state",
  "phone",
  "email",
] as const;

// body থেকে শুধু অনুমোদিত ফিল্ড নেওয়া ও যাচাই করা
const parseUpdateBody = (body: unknown): IUpdateUserInput => {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "Invalid request body");
  }

  const source = body as Record<string, unknown>;
  const result: IUpdateUserInput = {};

  for (const field of EDITABLE_FIELDS) {
    const value = source[field];
    if (value === undefined) continue;

    if (typeof value !== "string" || value.trim() === "") {
      throw new ApiError(400, `${field} must be a non-empty text`);
    }

    result[field] =
      field === "email" ? value.trim().toLowerCase() : value.trim();
  }

  if (result.email && !EMAIL_REGEX.test(result.email)) {
    throw new ApiError(400, "Please enter a valid email");
  }

  if (Object.keys(result).length === 0) {
    throw new ApiError(400, "No valid fields to update");
  }

  return result;
};

// PATCH /api/users/:id  (admin only)
export const editUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = parseUpdateBody(req.body);
    const data = await updateUserById(String(req.params.id), input);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    next(error);
  }
};



/* ---------- Staff (admin) ---------- */

// GET /api/users/staff  (admin only)
export const listStaff = async (
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

    const data = await getAllStaff(page, limit);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/staff/:id  (admin only)
export const removeStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteStaffById(String(req.params.id));

    res.status(200).json({
      success: true,
      message: "Staff deleted successfully",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    next(error);
  }
};