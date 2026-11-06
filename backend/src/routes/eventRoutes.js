import express from "express";
import { listPublicEvents } from "../controllers/clientEventController.js";

// public, no login needed: upcoming events for the website
const router = express.Router();

router.get("/", listPublicEvents);

export default router;
