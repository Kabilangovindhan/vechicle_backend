server,js

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");

// ----------------------------------------------------------------------------------------------

dotenv.config({ quiet: true });
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------------------------------

const User = require('./models/User');
const Complaint = require('./models/Complaint');

// ----------------------------------------------------------------------------------------------

app.get("/", (req, res) => {
	res.send("Complaint Tracking API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
	console.log(`Server running on port ${PORT}`)
);

// ----------------------------------------------------------------------------------------------

// Fetch user to show in user management page

app.get("/api/users", async (req, res) => {
	try {
		const users = await User.find().select("-password");
		res.json(users);
	} catch (err) {
		res.status(500).json({ message: "Server Error" });
	}
});

// ----------------------------------------------------------------------------------------------