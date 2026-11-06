import jwt from "jsonwebtoken";
import { Server } from "socket.io";

// The site reaches the API through the Vercel /api proxy, which cannot carry WebSockets,
// so the browser connects to this server directly. That connection is cross-site and
// cannot rely on the auth cookie; instead the client fetches a short-lived socket token
// through /api and presents it here.
const SOCKET_TOKEN_TTL = "2m";
const SOCKET_TOKEN_PURPOSE = "socket";

let io = null;

const userRoom = (userId) => `user:${userId}`;

export const createSocketToken = (userId) => jwt.sign(
    { id: String(userId), purpose: SOCKET_TOKEN_PURPOSE },
    process.env.JWT_SECRET,
    { expiresIn: SOCKET_TOKEN_TTL }
);

export const initRealtime = (httpServer, allowedOrigins) => {
    io = new Server(httpServer, {
        cors: { origin: allowedOrigins, credentials: true }
    });

    io.use((socket, next) => {
        try {
            const payload = jwt.verify(String(socket.handshake.auth?.token || ""), process.env.JWT_SECRET);
            if (payload.purpose !== SOCKET_TOKEN_PURPOSE) throw new Error("wrong token purpose");
            socket.data.userId = payload.id;
            next();
        } catch {
            next(new Error("Not authenticated"));
        }
    });

    io.on("connection", (socket) => {
        socket.join(userRoom(socket.data.userId));
    });

    return io;
};

// no-op until initRealtime runs, so callers never need to check
export const emitToUser = (userId, event, payload) => {
    io?.to(userRoom(String(userId))).emit(event, payload);
};
