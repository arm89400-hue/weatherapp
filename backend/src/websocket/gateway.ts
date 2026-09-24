import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { allowedOrigins } from "../config/env.js";
import { createRedisConnection, WEATHER_UPDATED_CHANNEL, type WeatherUpdatedEvent } from "../lib/redis.js";
import { verifyAccessToken } from "../modules/auth/tokens.js";
import { logger } from "../lib/logger.js";
import { registerRoomHandlers } from "./rooms.js";

export function createWebSocketGateway(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  const pubClient = createRedisConnection();
  const subClient = createRedisConnection();
  io.adapter(createAdapter(pubClient, subClient));

  // Token optional (weather updates are public, anonymous clients can subscribe), but if one
  // IS supplied it must be valid — a stale token shouldn't silently pass as anonymous.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next();
    try {
      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.sub, email: payload.email, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    logger.debug({ userId: socket.data.user?.id }, "socket connected");
    registerRoomHandlers(socket);
  });

  const eventsSub = createRedisConnection();
  eventsSub.subscribe(WEATHER_UPDATED_CHANNEL);
  eventsSub.on("message", (_channel: string, message: string) => {
    try {
      const event = JSON.parse(message) as WeatherUpdatedEvent;
      io.to(`province:${event.provinceId}`).emit("weather:updated", event);
    } catch (err) {
      logger.error({ err }, "Failed to process weather:updated event");
    }
  });

  return io;
}
