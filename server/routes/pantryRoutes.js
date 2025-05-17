import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addPantryItem,
  getPantryItems,
  removePantryItem,
  updatePantryItem,
} from "../controllers/pantryController.js";

const router = express.Router();

router.use(protect);

router.route("/").post(addPantryItem).get(getPantryItems);
router.route("/:pantry_item_id").put(updatePantryItem).delete(removePantryItem);

export default router;
