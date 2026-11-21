import type { Request, Response } from "express";
import { ServiceError } from "../../utils/service-error.util.js";
import {
    createCustomTravel,
    deleteCustomTravel,
    getAllCustomTravels,
    getCustomTravelById,
    getCustomTravelDirections,
    getMyCustomTravels,
    updateCustomTravelStatus,
    // type Actor,
} from "./custom-travel-request.service.js";

// requireAuth-er boshano user theke id + role
const getActor = (res: Response): Actor => ({
    id: res.locals.user.id,
    role: res.locals.user.role,
});

const handleError = (error: unknown, res: Response) => {
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

export const createCustomTravelController = async (
    req: Request,
    res: Response
) => {
    try {
        const data = await createCustomTravel(res.locals.user.id, req.body);
        return res.status(201).json({ success: true, data });
    } catch (error) {
        return handleError(error, res);
    }
};

export const getMyCustomTravelsController = async (
    _req: Request,
    res: Response
) => {
    try {
        const data = await getMyCustomTravels(res.locals.user.id);
        return res.json({ success: true, count: data.length, data });
    } catch (error) {
        return handleError(error, res);
    }
};

export const getAllCustomTravelsController = async (
    req: Request,
    res: Response
) => {
    try {
        const { items, meta } = await getAllCustomTravels(
            getActor(res),
            req.query as Record<string, unknown>
        );
        return res.json({ success: true, data: items, meta });
    } catch (error) {
        return handleError(error, res);
    }
};

export const getCustomTravelByIdController = async (
    req: Request,
    res: Response
) => {
    try {
        const data = await getCustomTravelById(
            getActor(res),
            String(req.params.id)
        );
        return res.json({ success: true, data });
    } catch (error) {
        return handleError(error, res);
    }
};

export const getCustomTravelDirectionsController = async (
    _req: Request,
    res: Response
) => {
    try {
        const data = await getCustomTravelDirections(getActor(res));
        return res.json({ success: true, data });
    } catch (error) {
        return handleError(error, res);
    }
};

export const deleteCustomTravelController = async (
    req: Request,
    res: Response
) => {
    try {
        await deleteCustomTravel(getActor(res), String(req.params.id));
        return res.json({
            success: true,
            message: "Custom travel request deleted",
        });
    } catch (error) {
        return handleError(error, res);
    }
};

export const updateCustomTravelStatusController = async (
    req: Request,
    res: Response
) => {
    try {
        const data = await updateCustomTravelStatus(
            getActor(res),
            String(req.params.id),
            req.body?.status
        );
        return res.json({ success: true, data });
    } catch (error) {
        return handleError(error, res);
    }
};

// import type { Request, Response } from "express";
// import type { Request, Response } from "express";
import {
    getCalendarDayDetails,
    getCalendarSummary,
    type Actor,
} from "./custom-travel-request.service.js";

export const getCalendarSummaryController = async (
    req: Request,
    res: Response
) => {
    const actor = res.locals.user as Actor;
    const data = await getCalendarSummary(actor, req.query);
    res.status(200).json({ success: true, data });
};

export const getCalendarDayController = async (
    req: Request,
    res: Response
) => {
    const actor = res.locals.user as Actor;
    const data = await getCalendarDayDetails(
        actor,
        req.params.date,
        req.query.status
    );
    res.status(200).json({ success: true, data });
};