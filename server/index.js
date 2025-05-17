import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Recipe Rover API!" });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is runnign on port ${PORT}`);
});
