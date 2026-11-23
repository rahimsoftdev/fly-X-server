import { ServiceError } from "../../utils/service-error.util.js";
import { createCustomTravel, deleteCustomTravel, getAllCustomTravels, getCustomTravelById, getCustomTravelDirections, getMyCustomTravels, updateCustomTravelStatus,
// type Actor,
 } from "./custom-travel-request.service.js";
// requireAuth-er boshano user theke id + role
const getActor = (res) => ({
    id: res.locals.user.id,
    role: res.locals.user.role,
});
const handleError = (error, res) => {
    if (error instanceof ServiceError) {
        return res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
    }
    console.error("custom travel controller error:", error);
    return res
        .status(500)
        .json({ success: false, message: "Something went wrong" });
};
export const createCustomTravelController = async (req, res) => {
    try {
        const data = await createCustomTravel(res.locals.user.id, req.body);
        return res.status(201).json({ success: true, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getMyCustomTravelsController = async (_req, res) => {
    try {
        const data = await getMyCustomTravels(res.locals.user.id);
        return res.json({ success: true, count: data.length, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getAllCustomTravelsController = async (req, res) => {
    try {
        const { items, meta } = await getAllCustomTravels(getActor(res), req.query);
        return res.json({ success: true, data: items, meta });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getCustomTravelByIdController = async (req, res) => {
    try {
        const data = await getCustomTravelById(getActor(res), String(req.params.id));
        return res.json({ success: true, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getCustomTravelDirectionsController = async (_req, res) => {
    try {
        const data = await getCustomTravelDirections(getActor(res));
        return res.json({ success: true, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const deleteCustomTravelController = async (req, res) => {
    try {
        await deleteCustomTravel(getActor(res), String(req.params.id));
        return res.json({
            success: true,
            message: "Custom travel request deleted",
        });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const updateCustomTravelStatusController = async (req, res) => {
    try {
        const data = await updateCustomTravelStatus(getActor(res), String(req.params.id), req.body?.status);
        return res.json({ success: true, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
// import type { Request, Response } from "express";
// import type { Request, Response } from "express";
import { getCalendarDayDetails, getCalendarSummary, } from "./custom-travel-request.service.js";
export const getCalendarSummaryController = async (req, res) => {
    const actor = res.locals.user;
    const data = await getCalendarSummary(actor, req.query);
    res.status(200).json({ success: true, data });
};
export const getCalendarDayController = async (req, res) => {
    const actor = res.locals.user;
    const data = await getCalendarDayDetails(actor, req.params.date, req.query.status);
    res.status(200).json({ success: true, data });
};
//# sourceMappingURL=custom-travel-request.controller.js.map