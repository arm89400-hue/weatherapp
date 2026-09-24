import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import { getUnreadCount, listAlertHistory, markAllRead } from "./alertHistory.service.js";

export const alertHistoryRouter = Router();

alertHistoryRouter.get("/", authGuard, async (req, res, next) => {
  try {
    res.json(await listAlertHistory(req.user!.id));
  } catch (err) {
    next(err);
  }
});

// Polled by the app for the red badge — kept separate so it doesn't pull the whole list.
alertHistoryRouter.get("/unread-count", authGuard, async (req, res, next) => {
  try {
    res.json({ unreadCount: await getUnreadCount(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

alertHistoryRouter.post("/read", authGuard, async (req, res, next) => {
  try {
    await markAllRead(req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
