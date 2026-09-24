import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  TMD_API_UID: z.string().optional(),
  TMD_API_UKEY: z.string().optional(),
  TMD_API_BASE_URL: z.string().default("https://data.tmd.go.th/api"),
  // Optional — lets Expo verify pushes came from us, but sending works without it.
  EXPO_ACCESS_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

// CORS_ORIGIN plus the pseudo-origins Capacitor's native shell loads local content from
// (https://localhost on Android, capacitor://localhost on iOS) — shared by REST CORS and
// Socket.IO CORS so they can't drift apart.
export const allowedOrigins = [env.CORS_ORIGIN, "https://localhost", "capacitor://localhost"];
