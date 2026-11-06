import { io } from "socket.io-client";
import api from "./api";

// Vercel's /api proxy cannot carry WebSockets, so the socket goes straight to the backend.
// Keep the production URL in sync with the /api rewrite in vercel.json.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
    || (import.meta.env.PROD ? "https://cueconnect-backend.onrender.com" : "http://localhost:5000");

// The cross-site connection cannot use the auth cookie, so each (re)connect first fetches
// a short-lived token through /api, where the cookie works.
export const connectRealtime = () => io(SOCKET_URL, {
    auth: (send) => {
        api.get("/client/socket-token")
            .then(({ data }) => send({ token: data.token }))
            .catch(() => send({ token: "" }));
    }
});
