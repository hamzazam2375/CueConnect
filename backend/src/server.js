import "dotenv/config";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

import connectDB from "./config/db.js";
import app, { allowedOrigins } from "./app.js";
import { initRealtime } from "./services/realtime.js";

const PORT = process.env.PORT || 5000;

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
