
import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";

const getId = (value) => {
    if (!value) return null;
    return String(typeof value === "object" ? value._id : value);
};

export const useChatStore = create((set, get) => ({
    conversation: [],
    conversations: [],
    currentConversation: null,
    currentUser: null,
    messages: [],

    onlineUsers: new Map(),
    typingUsers: new Map(),

    statuses: [],
    statusViewUpdates: {},

    loading: false,
    error: null,

    setCurrentUser: (user) => set({ currentUser: user }),

    initsocketListners: () => {
        const socket = getSocket();
        if (!socket) return;

        const events = [
            "receive_message",
            "message_send",
            "message_status_update",
            "message_edited",
            "message_deleted",
            "reaction_updated",
            "typing",
            "stop_typing",
            "user_online",
            "user_offline",
            "new_status",
            "status_viewed",
            "status_deleted"
        ];

        events.forEach((event) => socket.off(event));

        socket.on("receive_message", (message) => {
            get().receiveMessage(message);
        });

        socket.on("message_send", (message) => {
            get().receiveMessage(message);
        });

        socket.on("message_status_update", (data) => {
            const id = data?.messageId || data?.messageid;
            if (!id) return;

            set((state) => ({
                messages: state.messages.map((msg) =>
                    getId(msg._id) === getId(id)
                        ? {
                            ...msg,
                            messageStatus:
                                data.messageStatus || msg.messageStatus
                        }
                        : msg
                )
            }));
        });

        socket.on("message_edited", (updatedMessage) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    getId(msg._id) === getId(updatedMessage._id)
                        ? { ...msg, ...updatedMessage }
                        : msg
                )
            }));
        });

        socket.on("message_deleted", (data) => {
            const id = typeof data === "object"
                ? data.messageId || data._id
                : data;

            if (!id) return;

            set((state) => ({
                messages: state.messages.map((msg) =>
                    getId(msg._id) === getId(id)
                        ? {
                            ...msg,
                            isDeleted: true,
                            content: "",
                            imageOrVideoUrl: null
                        }
                        : msg
                )
            }));
        });

        socket.on("reaction_updated", (data) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    getId(msg._id) === getId(data.messageId)
                        ? { ...msg, reactions: data.reactions }
                        : msg
                )
            }));
        });

        socket.on("typing", ({ userId, conversationId }) => {
            set((state) => {
                const typingUsers = new Map(state.typingUsers);
                const users = new Set(
                    typingUsers.get(getId(conversationId)) || []
                );

                users.add(getId(userId));
                typingUsers.set(getId(conversationId), users);

                return { typingUsers };
            });
        });

        socket.on("stop_typing", ({ userId, conversationId }) => {
            set((state) => {
                const typingUsers = new Map(state.typingUsers);
                const id = getId(conversationId);
                const users = new Set(typingUsers.get(id) || []);

                users.delete(getId(userId));

                if (users.size) {
                    typingUsers.set(id, users);
                } else {
                    typingUsers.delete(id);
                }

                return { typingUsers };
            });
        });

        socket.on("user_online", (data) => {
            const userId = getId(data.userId || data._id);

            if (!userId) return;

            set((state) => {
                const onlineUsers = new Map(state.onlineUsers);
                onlineUsers.set(userId, {
                    isOnline: true,
                    lastSeen: null
                });
                return { onlineUsers };
            });
        });

        socket.on("user_offline", (data) => {
            const userId = getId(data.userId || data._id);

            if (!userId) return;

            set((state) => {
                const onlineUsers = new Map(state.onlineUsers);
                onlineUsers.set(userId, {
                    isOnline: false,
                    lastSeen: data.lastSeen
                });
                return { onlineUsers };
            });
        });

        socket.on("new_status", (status) => {
            get().addStatus(status);
        });

        socket.on("status_viewed", (data) => {
            get().updateStatusView(data);
        });

        socket.on("status_deleted", (id) => {
            get().removeStatus(id);
        });
    },

    fetchConversation: async () => {
        set({ loading: true, error: null });

        try {
            const { data } = await axiosInstance.get("/chats/conversations");

            set({
                conversation: data,
                conversations: data,
                loading: false
            });

            return data;
        } catch (error) {
            set({
                loading: false,
                error: error.response?.data?.message || error.message
            });
            return null;
        }
    },

    fetchMessages: async (conversationId) => {
        if (!conversationId) return null;

        set({ loading: true, error: null });

        try {
            const { data } = await axiosInstance.get(
                `/chats/conversations/${conversationId}/messages`
            );

            const messages = data.data || data.messages || data || [];

            set({
                messages,
                currentConversation: conversationId,
                loading: false
            });

            await get().maskMessagesAsRead();

            return messages;
        } catch (error) {
            set({
                loading: false,
                error: error.response?.data?.message || error.message
            });
            return null;
        }
    },

    sendMessage: async (formData) => {
        const senderId = formData.get("senderId");
        const receiverId = formData.get("receiverId");
        const conversationId = formData.get("conversationId");

        const media = formData.get("media");
        const content = formData.get("content");

        const tempId = `temp-${Date.now()}`;

        const optimisticMessage = {
            _id: tempId,
            sender: { _id: senderId },
            receiver: receiverId ? { _id: receiverId } : null,
            conversation: conversationId || get().currentConversation,
            content,
            contentType: media
                ? media.type?.startsWith("image")
                    ? "image"
                    : "video"
                : "text",
            imageOrVideoUrl:
                media && typeof media !== "string"
                    ? URL.createObjectURL(media)
                    : null,
            createdAt: new Date().toISOString(),
            messageStatus: "sending"
        };

        set((state) => ({
            messages: [...state.messages, optimisticMessage]
        }));

        try {
            const { data } = await axiosInstance.post(
                "/chats/send-message",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            const savedMessage = data.data || data.message || data;

            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === tempId ? savedMessage : msg
                )
            }));

            await get().fetchConversation();

            return savedMessage;
        } catch (error) {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === tempId
                        ? {
                            ...msg,
                            messageStatus: "failed",
                            error: error.response?.data?.message || error.message
                        }
                        : msg
                )
            }));

            throw error;
        }
    },

    receiveMessage: (message) => {
        if (!message?._id) return;

        const currentConversation = getId(get().currentConversation);
        const currentUser = getId(get().currentUser);
        const messageConversation = getId(
            message.conversation || message.conversationId
        );

        const isOpen = currentConversation === messageConversation;

        set((state) => {
            const exists = state.messages.some(
                (msg) => getId(msg._id) === getId(message._id)
            );

            let messages = state.messages;

            if (isOpen && !exists) {
                messages = [...messages, message];
            }

            const updateList = (list) => {
                if (!Array.isArray(list)) return list;

                const index = list.findIndex(
                    (conv) => getId(conv._id) === messageConversation
                );

                if (index === -1) return list;

                const conv = list[index];
                const senderId = getId(message.sender);
                const incoming = senderId !== currentUser;

                const updated = {
                    ...conv,
                    lastMessage: message,
                    unreadCount:
                        incoming && !isOpen && !exists
                            ? (conv.unreadCount || 0) + 1
                            : conv.unreadCount || 0
                };

                return [
                    updated,
                    ...list.filter((_, i) => i !== index)
                ];
            };

            return {
                messages,
                conversations: {
                    ...state.conversations,
                    data: updateList(state.conversations?.data)
                },
                conversation: {
                    ...state.conversation,
                    data: updateList(state.conversation?.data)
                }
            };
        });

        if (isOpen && getId(message.sender) !== currentUser) {
            get().maskMessagesAsRead();
        }
    },

    maskMessagesAsRead: async () => {
        const { currentConversation, currentUser, messages } = get();

        if (!currentConversation || !currentUser?._id) return;

        const socket = getSocket();

        if (socket?.connected) {
            socket.emit("conversation_read", {
                conversationId: getId(currentConversation)
            });
        }

        const unread = messages.filter((msg) => {
            const receiver = getId(msg.receiver);
            return (
                receiver === getId(currentUser) &&
                msg.messageStatus !== "read"
            );
        });

        if (!unread.length) return;

        set((state) => ({
            messages: state.messages.map((msg) =>
                unread.some((item) => getId(item._id) === getId(msg._id))
                    ? { ...msg, messageStatus: "read" }
                    : msg
            )
        }));

        try {
            await axiosInstance.put("/chats/message/read", {
                conversationId: getId(currentConversation)
            });
        } catch (error) {
            console.error("Read receipt update failed:", error.message);
        }
    },

    deleteMessage: async (messageId) => {
        try {
            await axiosInstance.delete(`/chats/message/${messageId}`);

            set((state) => ({
                messages: state.messages.map((msg) =>
                    getId(msg._id) === getId(messageId)
                        ? {
                            ...msg,
                            isDeleted: true,
                            content: "",
                            imageOrVideoUrl: null
                        }
                        : msg
                )
            }));

            return true;
        } catch (error) {
            set({
                error: error.response?.data?.message || error.message
            });
            return false;
        }
    },

    editMessage: async (messageId, content) => {
        try {
            const { data } = await axiosInstance.put(
                `/chats/message/${messageId}`,
                { content }
            );

            const updated = data.data || data.message || data;

            set((state) => ({
                messages: state.messages.map((msg) =>
                    getId(msg._id) === getId(messageId)
                        ? { ...msg, ...updated }
                        : msg
                )
            }));

            return updated;
        } catch (error) {
            console.error("Edit message failed:", error);
            return null;
        }
    },

    addReaction: async (messageId, emoji) => {
        try {
            const { data } = await axiosInstance.post(
                `/chats/message/${messageId}/reaction`,
                { emoji }
            );

            const updated = data.data || data.message || data;

            if (updated.reactions) {
                set((state) => ({
                    messages: state.messages.map((msg) =>
                        getId(msg._id) === getId(messageId)
                            ? { ...msg, reactions: updated.reactions }
                            : msg
                    )
                }));
            }

            return updated;
        } catch (error) {
            console.error("Reaction failed:", error);
            return null;
        }
    },

    startTyping: () => {
        const socket = getSocket();
        const conversationId = getId(get().currentConversation);

        if (socket?.connected && conversationId) {
            socket.emit("typing", { conversationId });
        }
    },

    stopTyping: () => {
        const socket = getSocket();
        const conversationId = getId(get().currentConversation);

        if (socket?.connected && conversationId) {
            socket.emit("stop_typing", { conversationId });
        }
    },

    isUserTyping: (userId) => {
        const { typingUsers, currentConversation } = get();
        const users = typingUsers.get(getId(currentConversation));
        return users?.has(getId(userId)) || false;
    },

    isUserOnline: (userId) => {
        return get().onlineUsers.get(getId(userId))?.isOnline || false;
    },

    getUserLastSeen: (userId) => {
        return get().onlineUsers.get(getId(userId))?.lastSeen || null;
    },

    searchUser: async (input, phoneSuffix = "") => {
        try {
            const isEmail = input.includes("@");

            const params = isEmail
                ? { email: input.trim() }
                : {
                    phoneNumber: input.trim(),
                    phoneSuffix: phoneSuffix.trim()
                };

            const { data } = await axiosInstance.get(
                "/auth/search-user",
                { params }
            );

            return data;
        } catch (error) {
            return {
                found: false,
                message: error.response?.data?.message || "User not found"
            };
        }
    },

    setStatuses: (statuses) => {
        set({ statuses: Array.isArray(statuses) ? statuses : [] });
    },

    addStatus: (status) => {
        if (!status?._id) return;

        set((state) => {
            const exists = state.statuses.some(
                (item) => getId(item._id) === getId(status._id)
            );

            return {
                statuses: exists
                    ? state.statuses.map((item) =>
                        getId(item._id) === getId(status._id)
                            ? { ...item, ...status }
                            : item
                    )
                    : [status, ...state.statuses]
            };
        });
    },

    updateStatusView: (data) => {
        if (!data?.statusId) return;

        set((state) => ({
            statusViewUpdates: {
                ...state.statusViewUpdates,
                [data.statusId]: data
            }
        }));
    },

    removeStatus: (statusId) => {
        set((state) => ({
            statuses: state.statuses.filter(
                (status) => getId(status._id) !== getId(statusId)
            )
        }));
    },

    cleanup: () => {
        set({
            conversation: [],
            conversations: [],
            currentConversation: null,
            messages: [],
            onlineUsers: new Map(),
            typingUsers: new Map(),
            statuses: [],
            statusViewUpdates: {}
        });
    }
}));
