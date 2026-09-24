import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../middleware/authGuard.js";
import {
  getAlertPreferences,
  resetAlertPreferences,
  updateAlertPreferences,
} from "./alertPreferences.service.js";

export const alertPreferencesRouter = Router();

// Bounds match the client's steppers — a value outside these means a bug or a hand-rolled request.
const thresholdsSchema = z
  .object({
    maxTempC: z.number().min(25).max(55),
    minTempC: z.number().min(-10).max(25),
    rainfallMm: z.number().min(1).max(100),
    alertHeat: z.boolean(),
    alertCold: z.boolean(),
    alertRain: z.boolean(),
    alertThunderstorm: z.boolean(),
  })
  .refine((t) => t.minTempC < t.maxTempC, {
    message: "minTempC must be below maxTempC",
    path: ["minTempC"],
  });

alertPreferencesRouter.get("/", authGuard, async (req, res, next) => {
  try {
    res.json(await getAlertPreferences(req.user!.id));
  } catch (err) {
    next(err);
  }
});

alertPreferencesRouter.put("/", authGuard, async (req, res, next) => {
  try {
    const thresholds = thresholdsSchema.parse(req.body);
    res.json(await updateAlertPreferences(req.user!.id, thresholds));
  } catch (err) {
    next(err);
  }
});

alertPreferencesRouter.delete("/", authGuard, async (req, res, next) => {
  try {
    res.json(await resetAlertPreferences(req.user!.id));
  } catch (err) {
    next(err);
  }
});
