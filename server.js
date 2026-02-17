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
const vehicleRoutes = require("./routes/customer/vehicleManage");
const adminBookingRoutes = require("./routes/admin/bookingManagement");
const customerBookingRoutes = require("./routes/customer/cutomerBooking");
const staffBookingRoutes = require("./routes/staff/staffBooking");
const customerServiceTrackRoutes = require("./routes/customer/customerServiceTrack");
const staffJobAssignRoutes = require("./routes/staff/staffJobAssign");


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
app.use('/api/vehicle',vehicleRoutes);
app.use('/api/adminBooking', adminBookingRoutes);
app.use('/api/customerBooking', customerBookingRoutes);
app.use('/api/staffBookingModel', staffBookingRoutes);
app.use('/api/customerServiceTrack', customerServiceTrackRoutes);
app.use('/api/staffJobAssign', staffJobAssignRoutes);

// ------------------------------------------------------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
	console.log(`Server running on port ${PORT}`)
);

// ------------------------------------------------------------------------------------------------------------------------

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







// Get all staff users







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
