import { Router } from "express";
// path ta apnar middleware file onujayi thik kore nin
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
    createTravelController,
    deleteTravelController,
    getAllTravelsController,
    getManageTravelByIdController,
    getManageTravelDirectionsController,
    getManageTravelsController,
    getMyTravelsController,
    updateManageTravelStatusController,
} from "./travel.controller.js";

const travelRouter = Router();

travelRouter.use(requireAuth);

travelRouter.post("/", createTravelController);
travelRouter.get("/", getAllTravelsController);

// staff/admin: "/manage/directions" অবশ্যই "/manage/:id"-এর আগে
travelRouter.get("/manage/directions", getManageTravelDirectionsController);
travelRouter.get("/manage", getManageTravelsController);
travelRouter.get("/manage/:id", getManageTravelByIdController);

// "/me" obossoi "/:id" er age thakte hobe
travelRouter.get("/me", getMyTravelsController);
travelRouter.delete("/:id", deleteTravelController);
travelRouter.patch("/manage/:id/status", updateManageTravelStatusController);

export default travelRouter;