import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../middleware/authGuard.js";
import { createSavedLocation, deleteSavedLocation, listSavedLocations } from "./savedLocations.service.js";

export const savedLocationsRouter = Router();

savedLocationsRouter.get("/", authGuard, async (req, res, next) => {
  try {
    const locations = await listSavedLocations(req.user!.id);
    res.json(locations);
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  provinceId: z.string(),
  districtId: z.string().nullable().optional(),
});

savedLocationsRouter.post("/", authGuard, async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const location = await createSavedLocation(req.user!.id, input);
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
});

savedLocationsRouter.delete("/:id", authGuard, async (req, res, next) => {
  try {
    const deleted = await deleteSavedLocation(req.user!.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Saved location not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
