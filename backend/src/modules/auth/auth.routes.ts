import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import {
  AuthError,
  loginUser,
  refreshSession,
  registerUser,
  revokeRefreshToken,
} from "./auth.service.js";

export const authRouter = Router();

const REFRESH_COOKIE = "refreshToken";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await registerUser(email, password, name);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.status(201).json({ accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await loginUser(email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new AuthError("Missing refresh token");

    const { accessToken, refreshToken, user } = await refreshSession(token);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.[REFRESH_COOKIE];
    if (token) {
      await revokeRefreshToken(token);
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
