const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// ------------------------------------------------------------------------------------------------------------------------

const UserModel = require("./models/user");
const VehicleModel = require("./models/vehicle");

// ------------------------------------------------------------------------------------------------------------------------

dotenv.config();
connectDB();

// ------------------------------------------------------------------------------------------------------------------------

const app = express();

app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
	console.log(`Server running on port ${PORT}`)
);

// ------------------------------------------------------------------------------------------------------------------------

// Get vehicle

app.get("/api/vehicle", async (req, res) => {

	try {
		const users = await VehicleModel.find();
		res.json(users);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// ------------------------------------------------------------------------------------------------------------------------

// Delete a user

app.delete("/api/vehicle/:id", async (req, res) => {

	try {
		await VehicleModel.findByIdAndDelete(req.params.id);
		res.json({ message: "Deleted" });

	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });

	}
});

// ------------------------------------------------------------------------------------------------------------------------

// Create a new user

app.post("/api/vehicle", async (req, res) => {

	try {
		const newUser = await VehicleModel.create(req.body);
		res.json(newUser);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});

// ------------------------------------------------------------------------------------------------------------------------

// Update a user

app.put("/api/vehicle/:id", async (req, res) => {

	try {
		const updated = await VehicleModel.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ new: true }
		);
		res.json(updated);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ------------------------------------------------------------------------------------------------------------------------