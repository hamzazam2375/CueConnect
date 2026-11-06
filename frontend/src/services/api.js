import axios from "axios";

const rawBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

// Production builds call the API on the site's own origin; vercel.json proxies /api to Render.
// A cross-site API makes the auth cookie third-party, which browsers block.
const baseURL = import.meta.env.PROD ? "/api" : rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    }
});

export default api;
