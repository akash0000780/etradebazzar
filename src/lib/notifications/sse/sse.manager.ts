import { Request, Response } from "express";
import { redis } from "../../../db/redis";
import { logger } from "../../../utils/logger";

const SSE_CHANNEL_PREFIX = "sse:user:";

const connections = new Map<string, Set<Response>>();

export const sseManager = {
    connect(userId: string, req: Request, res: Response) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        res.write("event: ping\ndata: connected\n\n");

        if (!connections.has(userId)) {
            connections.set(userId, new Set());
        }
        connections.get(userId)!.add(res);

        logger.debug({ userId }, "SSE client connected");

        const heartbeat = setInterval(() => {
            res.write("event: ping\ndata: heartbeat\n\n");
        }, 30_000);

        req.on("close", () => {
            clearInterval(heartbeat);
            connections.get(userId)?.delete(res);
            if (connections.get(userId)?.size === 0) {
                connections.delete(userId);
            }
            logger.debug({ userId }, "SSE client disconnected");
        });
    },

    pushToUser(userId: string, payload: NotificationPayload) {
        const userConnections = connections.get(userId);
        if (!userConnections?.size) return;

        const data = JSON.stringify(payload);
        for (const res of userConnections) {
            res.write(`event: notification\ndata: ${data}\n\n`);
        }
    },

    async publish(userId: string, payload: NotificationPayload) {
        const channel = `${SSE_CHANNEL_PREFIX}${userId}`;
        await redis.publish(channel, JSON.stringify(payload));
    },
};

export interface NotificationPayload {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    createdAt: string;
}