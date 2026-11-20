import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";
import cors from 'cors'
import router from "./router.js";

const app = express();
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

// Middleware
app.use(express.json());


// Central API Router
app.use("/api", router);

export default app;