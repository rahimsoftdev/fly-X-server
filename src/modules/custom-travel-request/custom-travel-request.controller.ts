import type { Request, Response } from "express";
import { ServiceError } from "../../utils/service-error.util.js";
import {
    createCustomTravel,
    deleteCustomTravel,
    getAllCustomTravels,
    getMyCustomTravels,
    updateCustomTravelStatus,
    type Actor,
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