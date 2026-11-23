import { Router } from "express";
// import { requireAuth } from "../../middlewares/requireAuth.js";
// import { requireRole } from "../../middlewares/requireRole.js";
import { listUsers, userCount } from "./user.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const userRouter = Router();

// public: মোট user সংখ্যা
userRouter.get("/count", userCount);

// শুধু admin: user তালিকা
userRouter.get("/", requireAuth, requireRole("admin"), listUsers);

export default userRouter;