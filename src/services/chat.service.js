
import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";

let socket = null;

export const initializeSocket = () => {
    const user = useUserStore.getState().user;

    if (!user?._id) return null;

    if (socket?.connected) return socket;

    if (socket) {
        socket.connect();
        return socket;
    }

    socket = io(import.meta.env.VITE_BACKEND_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
    });

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
    });

    socket.on("connected", (data) => {
        console.log("Authenticated socket:", data);
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
    });

    return socket;
};

export const getSocket = () => {
    if (!socket) return initializeSocket();
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
};
