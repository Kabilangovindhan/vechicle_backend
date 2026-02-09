const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const UserModel = require("./models/user");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ GET ALL USERS (VEHICLES DATA) */
app.get("/api/users", async (req, res) => {
  try {
    const users = await UserModel.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
