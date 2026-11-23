import { Router } from "express";
// import { requireAuth } from "../../middlewares/requireAuth.js";
// import { requireRole } from "../../middlewares/requireRole.js";
import { editUser, listStaff, listUsers, removeStaff, userCount } from "./user.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const userRouter = Router();

// public: মোট user সংখ্যা
userRouter.get("/count", userCount);

// শুধু admin: user তালিকা
userRouter.get("/", requireAuth, requireRole("admin"), listUsers);

// শুধু admin: user edit
userRouter.patch("/:id", requireAuth, requireRole("admin"), editUser);



// শুধু admin: staff তালিকা
userRouter.get("/staff", requireAuth, requireRole("admin"), listStaff);

// শুধু admin: staff ডিলিট
userRouter.delete("/staff/:id", requireAuth, requireRole("admin"), removeStaff);
export default userRouter;