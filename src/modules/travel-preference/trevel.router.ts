import { Router } from "express";
// path ta apnar middleware file onujayi thik kore nin
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
    createTravelController,
    deleteTravelController,
    getAllTravelsController,
    getMyTravelsController,
} from "./travel.controller.js";

const travelRouter = Router();

travelRouter.use(requireAuth);

travelRouter.post("/", createTravelController);
travelRouter.get("/", getAllTravelsController);

// "/me" obossoi "/:id" er age thakte hobe
travelRouter.get("/me", getMyTravelsController);
travelRouter.delete("/:id", deleteTravelController);

export default travelRouter;