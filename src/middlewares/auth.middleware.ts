import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const BASE_URL = process.env.BETTER_AUTH_URL;

if (!BASE_URL) {
  throw new Error("BETTER_AUTH_URL is not set in .env");
}

const JWKS = createRemoteJWKSet(new URL(`${BASE_URL}/api/auth/jwks`));

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const token = header.slice(7);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: BASE_URL,
      audience: BASE_URL,
    });

    // JWT-এর id বা sub হলো user id
    res.locals.user = {
      id: String(payload.id ?? payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? "user").toLowerCase(),
    };

    next();
  } catch (error) {
    console.error("requireAuth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};