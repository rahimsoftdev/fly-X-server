import type { Request, Response } from "express";
import {
    createTravel,
    deleteTravel,
    getAllTravels,
    getMyTravels,
    ServiceError,
} from "./travel.service.js";

// Sob controller-er common error handler
const handleError = (error: unknown, res: Response) => {
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

export const createTravelController = async (req: Request, res: Response) => {
    try {
        const data = await createTravel(res.locals.user.id, req.body);
        return res.status(201).json({ success: true, data });
    } catch (error) {
        return handleError(error, res);
    }
};

export const getMyTravelsController = async (_req: Request, res: Response) => {
    try {
        const data = await getMyTravels(res.locals.user.id);
        return res.json({ success: true, count: data.length, data });
    } catch (error) {
        return handleError(error, res);
    }
};

export const deleteTravelController = async (req: Request, res: Response) => {
    try {
        await deleteTravel(res.locals.user.id, String(req.params.id));
        return res.json({
            success: true,
            message: "Travel preference deleted",
        });
    } catch (error) {
        return handleError(error, res);
    }
};

export const getAllTravelsController = async (req: Request, res: Response) => {
    try {
        const { items, meta } = await getAllTravels(
            req.query as Record<string, unknown>
        );
        return res.json({ success: true, data: items, meta });
    } catch (error) {
        return handleError(error, res);
    }
};