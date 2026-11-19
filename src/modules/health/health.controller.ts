import type { Request, Response } from "express";

const getHealth = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
  });
};

export default getHealth;