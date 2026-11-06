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

const app = express();

const PORT = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client", clientRoutes);

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

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

startServer();
