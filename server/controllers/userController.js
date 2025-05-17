import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// @desc    Register a new user
// @desc    POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      message:
        "Please provide all required fields: username, email, and password.",
    });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    return res
      .status(400)
      .json({ message: "Please provide a valid email address." });
  }

  try {
    const userExists = await pool.query(
      "SELECT * FROM Users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (userExists.rows.length > 0) {
      const existingField =
        userExists.rows[0].username === username ? "Username" : "Email";
      return res
        .status(409)
        .json({ message: `${existingField} already exists.` });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUserQuery = `INSERT INTO Users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, username, email, created_at;`;
    const newUser = await pool.query(newUserQuery, [
      username,
      email,
      password_hash,
    ]);

    if (newUser.rows.length > 0) {
      const user = newUser.rows[0];
      return res.status(201).json({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        message: "User registered successfully.",
      });
    } else {
      return res
        .status(500)
        .json({ message: "Error creating user after validation." });
    }
  } catch (error) {
    console.error("Error during user registration:", error);
    if (error.code === "23505") {
      if (error.constraint == "users_username_key") {
        return res.status(409).json({ message: "Username already exists." });
      }
      if (error.constraint === "users_email_key") {
        return res.status(409).json({ message: "Email already exists." });
      }
    }
    return res
      .status(500)
      .json({ message: "Server error during user registration." });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide both email and password." });
  }

  try {
    const userQuery = "SELECT * FROM Users WHERE email = $1";
    const { rows } = await pool.query(userQuery, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = rows[0];

    console.log(user.password_hash);
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = generateToken(user.user_id);

    res.status(200).json({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      token: token,
      message: "User logged in successfully.",
    });
  } catch (error) {
    console.error("Error during user login:", error);
    res.status(500).json({ message: "Server error during user login." });
  }
};

export { registerUser, loginUser, generateToken };
