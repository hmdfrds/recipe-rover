import express from "express";
import {
  createRecipe,
  getRecipeById,
  getRecipes,
} from "../controllers/recipeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createRecipe);
router.get("/", getRecipes);
router.get("/:id", getRecipeById);

export default router;
