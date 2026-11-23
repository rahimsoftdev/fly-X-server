import { Router } from "express";
// path ta apnar middleware file onujayi thik kore nin
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { createCustomTravelController, deleteCustomTravelController, getAllCustomTravelsController, getCalendarDayController, getCalendarSummaryController, getCustomTravelByIdController, getCustomTravelDirectionsController, getMyCustomTravelsController, updateCustomTravelStatusController, } from "./custom-travel-request.controller.js";
const customTravelRouter = Router();
customTravelRouter.use(requireAuth);
customTravelRouter.post("/", createCustomTravelController);
customTravelRouter.get("/", getAllCustomTravelsController); // admin/staff
// "/me", "/directions" ar "/calendar" obossoi "/:id" er age thakte hobe
customTravelRouter.get("/me", getMyCustomTravelsController);
customTravelRouter.get("/directions", getCustomTravelDirectionsController); // admin/staff
customTravelRouter.get("/calendar", getCalendarSummaryController); // admin/staff
customTravelRouter.get("/calendar/:date", getCalendarDayController); // admin/staff
customTravelRouter.get("/:id", getCustomTravelByIdController); // details
customTravelRouter.patch("/:id/status", updateCustomTravelStatusController);
customTravelRouter.delete("/:id", deleteCustomTravelController);
export default customTravelRouter;
//# sourceMappingURL=custom-travel-request.route.js.map