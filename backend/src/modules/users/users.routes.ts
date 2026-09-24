import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authGuard } from "../../middleware/authGuard.js";

export const usersRouter = Router();

usersRouter.get("/me", authGuard, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});
