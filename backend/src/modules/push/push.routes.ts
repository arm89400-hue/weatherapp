import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../middleware/authGuard.js";
import { removeSubscription, saveSubscription, sendPushToUser } from "./push.service.js";

export const pushRouter = Router();

const tokenSchema = z.object({ expoPushToken: z.string().min(1) });

pushRouter.post("/subscribe", authGuard, async (req, res, next) => {
  try {
    const { expoPushToken } = tokenSchema.parse(req.body);
    await saveSubscription(req.user!.id, expoPushToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

pushRouter.delete("/subscribe", authGuard, async (req, res, next) => {
  try {
    const { expoPushToken } = tokenSchema.parse(req.body);
    await removeSubscription(req.user!.id, expoPushToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// "Send test notification" button in the app's Notifications page — lets you check the whole
// device → Expo → FCM chain without waiting for real severe weather.
pushRouter.post("/test", authGuard, async (req, res, next) => {
  try {
    const sent = await sendPushToUser(req.user!.id, {
      kind: "test",
      title: "Test notification",
      body: "Weather alerts are working on this device.",
      url: "/",
    });
    if (sent === 0) return res.status(404).json({ error: "No push subscription for this account" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
