import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";

// The Express app on its own, without a database connection or a listening port,
// so server.js can start it and the tests can run it against a test database.

export const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

const app = express();

app.set("trust proxy", 1);

// middleware
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/branches", branchRoutes);

// health checks
app.get("/", (req, res) => {
    res.send("CueConnect Backend is running");
});

app.get("/api/health", (req, res) => {
    res.json({ message: "CueConnect API is running" });
});

export default app;
