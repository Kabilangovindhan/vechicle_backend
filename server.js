const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const jwt = require("jsonwebtoken");

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




// ============================================================
// USER APIs
// ============================================================

// Get all users
app.get("/api/user", async (req, res) => {
	try {
		const users = await UserModel.find().sort({ createdAt: -1 });
		res.json(users);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});


// Create new user
app.post("/api/user", async (req, res) => {
	try {
		const newUser = await UserModel.create(req.body);
		res.json(newUser);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});


// Update user
app.put("/api/user/:id", async (req, res) => {
	try {
		const updatedUser = await UserModel.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ new: true }
		);
		res.json(updatedUser);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});


// Delete user
app.delete("/api/user/:id", async (req, res) => {
	try {
		await UserModel.findByIdAndDelete(req.params.id);
		res.json({ message: "User Deleted Successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});




// ============================================================
// CUSTOMER REGISTER (SAVE REGISTER PAGE DATA TO DB)
// ============================================================

app.post("/api/customer/register", async (req, res) => {

	try {
		console.log(req.body)

		const { fullName, email, phone, password } = req.body;

		// Check if email already exists
		const existingUser = await UserModel.findOne({ phone });
		if (existingUser) {
			return res.status(400).json({
				message: "Phone number already registered"
			});
		}

		// Create new user
		const newUser = await UserModel.create({
			name: fullName,   // mapping frontend → db field
			email,
			phone,
			password,
			role: "customer"
		});

		res.json({
			success: true,
			message: "Registration Successful",
			user: newUser
		});

	} catch (error) {

		console.error(error);

		res.status(500).json({
			message: "Registration Failed",
			error: error.message
		});

	}

});


//login//
app.post("/api/customer/login", async (req, res) => {
	try {

		const { phone, password } = req.body;

		const user = await UserModel.findOne({ phone });

		if (!user) {
			return res.status(400).json({ message: "User not found" });
		}

		const isMatch = password === user.password; // For simplicity, using plain text. In production, use bcrypt to compare hashed passwords.

		if (!isMatch) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		// JWT TOKEN
		const token = jwt.sign(
			{
				id: user._id,
				phone: user.phone,
				role: user.role
			},
			process.env.JWT_SECRET || "secretkey",
			{ expiresIn: "1d" }
		);

		res.json({
			token,
			user: {
				name: user.name,
				phone: user.phone,
				role: user.role
			}
		});

	} catch (error) {
		res.status(500).json({ message: "Login Failed" });
	}
});



