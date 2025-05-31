import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addFavoriteRecipe,
  getFavoriteRecipes,
  removeFavoriteRecipe,
} from "../controllers/favoriteController.js";

const router = express.Router();

router.use(protect);

router.route("/").post(addFavoriteRecipe).get(getFavoriteRecipes);

router.route("/:recipe_id").delete(removeFavoriteRecipe);

export default router;
