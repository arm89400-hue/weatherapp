import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { allowedOrigins } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { geoRouter } from "./modules/geo/geo.routes.js";
import { weatherRouter } from "./modules/weather/weather.routes.js";
import { stationsRouter } from "./modules/stations/stations.routes.js";
import { pushRouter } from "./modules/push/push.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { savedLocationsRouter } from "./modules/savedLocations/savedLocations.routes.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Weather/geo data is public — device-location weather is the app's landing experience,
  // shown before any login. push/users routes are authGuard-protected per-route (see those
  // modules) since they're inherently account-specific (favorite location, push subscriptions).
  app.use("/api/auth", authRouter);
  app.use("/api/geo", geoRouter);
  app.use("/api/stations", stationsRouter);
  app.use("/api/weather", weatherRouter);
  app.use("/api/push", pushRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/saved-locations", savedLocationsRouter);

  app.use(errorHandler);

  return app;
}
