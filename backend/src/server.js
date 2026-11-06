import "dotenv/config";
import dns from "node:dns";
import express from "express";

dns.setDefaultResultOrder("ipv4first");
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import { initRealtime } from "./services/realtime.js";

const app = express();

const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

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

// health checks
app.get("/", (req, res) => {
    res.send("CueConnect Backend is running");
});

app.get("/api/health", (req, res) => {
    res.json({ message: "CueConnect API is running" });
});

// start server
const startServer = async () => {
    try {
        await connectDB();

        const server = app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
        initRealtime(server, allowedOrigins);
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

startServer();
