import express from "express";
import healthRouter from "./modules/health/health.router.js";

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);

export default app;