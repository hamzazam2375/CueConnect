import express from "express";
import { listPublicBranches } from "../controllers/publicBranchController.js";

// public, no login needed: branches, their tables, and prices for the website
const router = express.Router();

router.get("/", listPublicBranches);

export default router;
