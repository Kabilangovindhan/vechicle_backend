const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const jwt = require("jsonwebtoken");

// ------------------------------------------------------------------------------------------------------------------------

const UserModel = require("./models/user");
const VehicleModel = require("./models/vehicle");
const BookingModel = require("./models/booking");



function verifyToken(req, res, next) {

	const bearerHeader = req.headers["authorization"];

	if (!bearerHeader) {
		return res.status(401).json({ message: "Access Denied. No Token Provided" });
	}

	const token = bearerHeader.split(" ")[1];

	jwt.verify(token, "SECRET_KEY", (err, decoded) => {
		if (err) {
			return res.status(403).json({ message: "Invalid Token" });
		}

		req.user = decoded;
		next();
	});
}


// ------------------------------------------------------------------------------------------------------------------------

dotenv.config({ quiet: true });
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

// Get vehicle for Vechile Master

app.get("/api/vehicle", async (req, res) => {

	try {
		const users = await VehicleModel.find();
		res.json(users);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});






app.post("/api/vehicle/user", async (req, res) => {
	console.log(req.body)
	try {
		const users = await VehicleModel.find({ ownerPhone: req.body.phone });
		res.json(users);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});


// ------------------------------------------------------------------------------------------------------------------------

// Delete vehicle for Vechile Master

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

// Create vehicle for Vechile Master

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

// Update vehicle for Vechile Master

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

// Get all users for User Management

app.get("/api/user", async (req, res) => {
	try {
		const users = await UserModel.find().sort({ createdAt: -1 });
		res.json(users);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// ------------------------------------------------------------------------------------------------------------------------

// Create users for User Management

app.post("/api/user", async (req, res) => {
	try {
		const newUser = await UserModel.create(req.body);
		res.json(newUser);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});

// ------------------------------------------------------------------------------------------------------------------------

// Update users for User Management

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

// ------------------------------------------------------------------------------------------------------------------------

// Delete users for User Management

app.delete("/api/user/:id", async (req, res) => {
	try {
		await UserModel.findByIdAndDelete(req.params.id);
		res.json({ message: "User Deleted Successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});

// ------------------------------------------------------------------------------------------------------------------------

// Register User from Login Menu

app.post("/api/customer/register", async (req, res) => {

	try {

		const { fullName, email, phone, password } = req.body;

		const existingUser = await UserModel.findOne({ phone });
		if (existingUser) {
			return res.status(400).json({
				message: "Phone number already registered"
			});
		}

		const newUser = await UserModel.create({
			name: fullName, email,
			phone, password,
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

// ------------------------------------------------------------------------------------------------------------------------

// Login User from Login Menu

app.post("/api/customer/login", async (req, res) => {

	try {

		const { phone, password } = req.body;

		const user = await UserModel.findOne({ phone });

		if (!user) { return res.status(400).json({ message: "User not found" }) }

		const isMatch = password === user.password;

		if (!isMatch) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

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

// ------------------------------------------------------------------------------------------------------------------------

// Create Booking

app.post("/api/booking", async (req, res) => {

	try {

		const user = await UserModel.findOne({
			phone: req.body.customerPhone
		});

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const booking = await BookingModel.create({
			customer: user._id,
			vehicle: req.body.vehicle,
			serviceType: req.body.serviceType,
			problemDescription: req.body.problemDescription,
			appointmentDate: req.body.appointmentDate
		});

		res.json(booking);

	} catch (err) {
		console.log("Booking Create Error:", err);
		res.status(500).json({ error: err.message });
	}
});

// ------------------------------------------------------------------------------------------------------------------------

app.get("/api/booking/customer/:phone", async (req, res) => {

	try {

		const user = await UserModel.findOne({ phone: req.params.phone });

		if (!user) return res.json([]);

		const bookings = await BookingModel
			.find({ customer: user._id })
			.populate("vehicle")
			.sort({ createdAt: -1 });

		res.json(bookings);

	} catch (err) {
		console.log("Booking Fetch Error:", err);
		res.status(500).json([]);
	}
})

// ------------------------------------------------------------------------------------------------------------------------