import "dotenv/config";
import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import pantryRoutes from "./routes/pantryRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/users", userRoutes);
app.use("/api/pantry", pantryRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Recipe Rover API!" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something broke!", error: err.message });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is runnign on port ${PORT}`);
});
