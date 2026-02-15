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
const JobModel = require("./models/job");
const InspectionModel = require("./models/inspection");
const EstimateModel = require("./models/estimate");

// ------------------------------------------------------------------------------------------------------------------------

const customerRoutes = require("./routes/admin/customerManagement");


// ------------------------------------------------------------------------------------------------------------------------


function verifyToken(req, res, next) {

	const bearerHeader = req.headers["authorization"];

	if (!bearerHeader) {
		return res.status(401).json({ message: "Access Denied. No Token Provided" });
	}

	const token = bearerHeader.split(" ")[1];

	jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, decoded) => {
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
app.use('/api/customerManage', customerRoutes);


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

// ------------------------------------------------------------------------------------------------------------------------

// Create vehicle for Vechile Master

app.post("/api/vehicle/user", async (req, res) => {

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


// Get ALL bookings (Admin)
app.get("/api/booking", async (req, res) => {

	try {

		const bookings = await BookingModel
			.find()
			.populate("customer")
			.populate("vehicle")
			.sort({ createdAt: -1 });

		res.json(bookings);

	} catch (err) {

		console.log(err);
		res.status(500).json({ message: "Failed to fetch bookings" });

	}

});


// Update booking status
app.put("/api/booking/:id", async (req, res) => {

	try {

		const { status } = req.body;

		const updated = await BookingModel.findByIdAndUpdate(
			req.params.id,
			{ status },
			{ new: true }
		);

		res.json(updated);

	} catch (err) {

		console.log(err);
		res.status(500).json({ message: "Failed to update status" });

	}

});


// 
// Admin approve booking and assign staff
app.put("/api/admin/booking/:id/approve", verifyToken, async (req, res) => {

	try {

		const bookingId = req.params.id;
		const { mechanicId, priority } = req.body;

		// 1. Update booking status
		const booking = await BookingModel.findByIdAndUpdate(
			bookingId,
			{ status: "Approved" },
			{ new: true }
		);

		if (!booking) {
			return res.status(404).json({ message: "Booking not found" });
		}

		// 2. Create Job and assign mechanic
		const job = await JobModel.create({
			booking: bookingId,
			assignedStaff: mechanicId,
			priority: priority || "Normal",
			jobStatus: "Assigned"
		});

		res.json({
			message: "Booking approved and job assigned",
			booking,
			job
		});

	} catch (err) {

		console.log(err);
		res.status(500).json({
			message: "Approval failed"
		});

	}

});

// Get all staff users
app.get("/api/admin/staff", verifyToken, async (req, res) => {

	try {

		const staff = await UserModel.find({ role: "staff" })
			.select("_id name phone");

		res.json(staff);

	} catch (err) {

		res.status(500).json({
			message: "Failed to fetch staff"
		});

	}

});




app.put("/api/staff/booking/:id/reject", verifyToken, async (req, res) => {

	try {

		const booking = await BookingModel.findByIdAndUpdate(
			req.params.id,
			{ status: "Rejected" },
			{ new: true }
		);

		res.json({
			message: "Booking rejected",
			booking
		});

	} catch (err) {

		res.status(500).json({ message: "Reject failed" });

	}

});


app.put("/api/staff/job/:id/assign", verifyToken, async (req, res) => {

	try {

		const { mechanicId, priority } = req.body;

		const job = await JobModel.findByIdAndUpdate(
			req.params.id,
			{
				assignedStaff: mechanicId,
				priority: priority || "Normal",
				jobStatus: "Assigned"
			},
			{ new: true }
		)
			.populate("assignedStaff")
			.populate("booking");

		res.json(job);

	} catch (err) {

		res.status(500).json({
			message: "Assignment failed"
		});

	}

});


app.get("/api/staff/bookings/pending", verifyToken, async (req, res) => {

	try {

		const bookings = await BookingModel
			.find({ status: "Pending" })
			.populate("customer")
			.populate("vehicle")
			.sort({ createdAt: -1 });

		res.json(bookings);

	} catch (err) {

		res.status(500).json({ message: "Fetch failed" });

	}

});


app.get("/api/staff/jobs", verifyToken, async (req, res) => {

	try {

		const jobs = await JobModel
			.find({ assignedStaff: req.user.id })
			.populate({
				path: "booking",
				populate: ["customer", "vehicle"]
			})
			.populate("assignedStaff");

		res.json(jobs);

	} catch (err) {

		res.status(500).json({ message: "Fetch jobs failed" });

	}

});


app.post("/api/staff/inspection/:jobId", verifyToken, async (req, res) => {

	try {

		const inspection = await InspectionModel.create({

			job: req.params.jobId,

			issues: req.body.issues,

			remarks: req.body.remarks,

			images: req.body.images || [],

			inspectedBy: req.user.id

		});

		// Update job status
		await JobModel.findByIdAndUpdate(
			req.params.jobId,
			{ jobStatus: "Inspection" }
		);

		res.json(inspection);

	} catch (err) {

		res.status(500).json({
			message: "Inspection failed"
		});

	}

});


app.post("/api/staff/estimate/:jobId", verifyToken, async (req, res) => {

	try {

		const { labourCost, partsCost, tax } = req.body;

		const totalCost =
			Number(labourCost) +
			Number(partsCost) +
			Number(tax);

		const estimate = await EstimateModel.create({

			job: req.params.jobId,

			labourCharge: labourCost,

			partsCost,

			tax,

			totalAmount: totalCost

		});

		await JobModel.findByIdAndUpdate(
			req.params.jobId,
			{ jobStatus: "Waiting Approval" }
		);

		res.json(estimate);

	} catch (err) {

		console.log(err);

		res.status(500).json({
			message: "Estimate creation failed"
		});

	}

});


app.get("/api/customer/estimate/:jobId", verifyToken, async (req, res) => {

	try {

		const estimate = await EstimateModel
			.findOne({ job: req.params.jobId })
			.populate({
				path: "job",
				populate: {
					path: "booking",
					populate: ["vehicle"]
				}
			});

		res.json(estimate);

	} catch (err) {

		res.status(500).json({
			message: "Fetch estimate failed"
		});

	}

});


app.put("/api/customer/estimate/:id/approve", verifyToken, async (req, res) => {

	try {

		const estimate = await EstimateModel.findByIdAndUpdate(
			req.params.id,
			{ status: "Approved" },
			{ new: true }
		);

		await JobModel.findByIdAndUpdate(
			estimate.job,
			{ jobStatus: "Working" }
		);

		res.json({
			message: "Estimate approved"
		});

	} catch (err) {

		res.status(500).json({
			message: "Approval failed"
		});

	}

});


app.put("/api/customer/estimate/:id/approve", verifyToken, async (req, res) => {

	try {

		const estimate = await EstimateModel.findByIdAndUpdate(
			req.params.id,
			{ status: "Approved" },
			{ new: true }
		);

		await JobModel.findByIdAndUpdate(
			estimate.job,
			{ jobStatus: "Working" }
		);

		res.json({
			message: "Estimate approved"
		});

	} catch (err) {

		res.status(500).json({
			message: "Approval failed"
		});

	}

});


app.put("/api/customer/estimate/:id/reject", verifyToken, async (req, res) => {

	try {

		const estimate = await EstimateModel.findByIdAndUpdate(
			req.params.id,
			{ status: "Rejected" },
			{ new: true }
		);

		await JobModel.findByIdAndUpdate(
			estimate.job,
			{ jobStatus: "Rejected" }
		);

		res.json({
			message: "Estimate rejected"
		});

	} catch (err) {

		res.status(500).json({
			message: "Reject failed"
		});

	}

});
