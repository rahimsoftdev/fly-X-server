import { createTravel, deleteTravel, getAllTravels, getMyTravels, ServiceError, updateManageTravelStatus, } from "./travel.service.js";
import { getManageTravelById, getManageTravelDirections, getManageTravels, } from "./travel.service.js";
// Sob controller-er common error handler
const handleError = (error, res) => {
    if (error instanceof ServiceError) {
        return res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
    }
    console.error("travel controller error:", error);
    return res
        .status(500)
        .json({ success: false, message: "Something went wrong" });
};
export const createTravelController = async (req, res) => {
    try {
        const data = await createTravel(res.locals.user.id, req.body);
        return res.status(201).json({ success: true, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getMyTravelsController = async (_req, res) => {
    try {
        const data = await getMyTravels(res.locals.user.id);
        return res.json({ success: true, count: data.length, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const deleteTravelController = async (req, res) => {
    try {
        await deleteTravel(res.locals.user.id, String(req.params.id));
        return res.json({
            success: true,
            message: "Travel preference deleted",
        });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getAllTravelsController = async (req, res) => {
    try {
        const { items, meta } = await getAllTravels(req.query);
        return res.json({ success: true, data: items, meta });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getManageTravelsController = async (req, res) => {
    try {
        const actor = res.locals.user;
        const { items, meta } = await getManageTravels(actor, req.query);
        return res.json({ success: true, data: items, meta });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getManageTravelByIdController = async (req, res) => {
    try {
        const actor = res.locals.user;
        const data = await getManageTravelById(actor, String(req.params.id));
        return res.json({ success: true, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const getManageTravelDirectionsController = async (req, res) => {
    try {
        const actor = res.locals.user;
        const data = await getManageTravelDirections(actor, req.query.type);
        return res.json({ success: true, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
export const updateManageTravelStatusController = async (req, res) => {
    try {
        const actor = res.locals.user;
        const data = await updateManageTravelStatus(actor, String(req.params.id), req.body?.status);
        return res.json({ success: true, data });
    }
    catch (error) {
        return handleError(error, res);
    }
};
//# sourceMappingURL=travel.controller.js.map