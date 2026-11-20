import { Router } from "express";
// path ta apnar middleware file onujayi thik kore nin
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
    createCustomTravelController,
    deleteCustomTravelController,
    getAllCustomTravelsController,
    getMyCustomTravelsController,
    updateCustomTravelStatusController,
} from "./custom-travel-request.controller.js";

const customTravelRouter = Router();

customTravelRouter.use(requireAuth);

customTravelRouter.post("/", createCustomTravelController);
customTravelRouter.get("/", getAllCustomTravelsController); // admin/staff
customTravelRouter.get("/me", getMyCustomTravelsController);
customTravelRouter.patch("/:id/status", updateCustomTravelStatusController);
customTravelRouter.delete("/:id", deleteCustomTravelController);

export default customTravelRouter;