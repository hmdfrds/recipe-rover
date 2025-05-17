import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userQuery = await pool.query(
        "SELECT user_id, username, email, created_at FROM Users WHERE user_id = $1;",
        [decoded.userId]
      );

      if (userQuery.rows.length === 0) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found." });
      }

      req.user = userQuery.rows[0];
      next();
    } catch (error) {
      console.error("Token verification failed:", error.message);
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          message:
            "Not authorized, token failed (invalid signature or malformed).",
        });
      }
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Not authorized, token expired." });
      }
      return res.status(401).json({ message: "Not authorized, token failed." });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token provided." });
  }
};

export { protect };
