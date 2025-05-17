import express from "express";
import { loginUser, registerUser } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/profile", protect, (req, res) => {
  if (req.user) {
    res.status(200).json({
      user_id: req.user.user_id,
      username: req.user.username,
      email: req.user.email,
      created_at: req.user.created_at,
      message: "User profile data fetched successfully.",
    });
  } else {
    res
      .status(401)
      .json({ message: "Not authorized, user data not available." });
  }
});

export default router;
