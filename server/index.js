import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./config/db.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Recipe Rover API!" });
});

const PORT = process.env.PORT || 5001;

// Test DB connection
(async () => {
  try {
    const client = await pool.connect();
    console.log("Attempting to query current time from DB...");
    const result = await client.query("SELECT NOW()");
    console.log("DB Connection Test Successful: ", result.rows[0]);
    client.release();
  } catch (err) {
    console.error("Failed to connect to the database or execute query.", err);
  }
})();

app.listen(PORT, () => {
  console.log(`Server is runnign on port ${PORT}`);
});
