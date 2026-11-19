import express from "express";
import healthRouter from "./modules/health/health.router.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";
import cors from 'cors'

const app = express();
app.use(
    cors({
        origin:process.env.CLIENT_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

// Middleware
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);

export default app;