import axios from "axios";

const rawBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const baseURL = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    }
});

export default api;
