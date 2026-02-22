const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// ------------------------------------------------------------------------------------------------------------------------

// Admin Routes
const customerManagementRoutes = require("./routes/admin/customerManagement");
const jobAssignmentRoutes = require("./routes/admin/jobAssignment");

// Common Routes
const authenticationRoutes = require("./routes/common/authentication");

// Customer Routes
const myVehicleRoutes = require("./routes/customer/myVehicle");
const serviceTrackingRoutes = require("./routes/customer/serviceTracking");
const serviceBookingRoutes = require("./routes/customer/serviceBooking");
const EstimateApprovalRoutes = require("./routes/customer/customerEstimate");

// Staff Routes
const inspectionReportRoutes = require("./routes/staff/inspectionReport");
const assignedJobRoutes = require("./routes/staff/assignedJob");

// ------------------------------------------------------------------------------------------------------------------------

dotenv.config({ quiet: true });
connectDB();

// ------------------------------------------------------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------------------------------------------------------------

// Admin Routes
app.use('/api/customerManagement', customerManagementRoutes);
app.use('/api/jobAssignment', jobAssignmentRoutes);

// Common Routes
app.use('/api/authentication', authenticationRoutes);

// Customer Routes
app.use('/api/myVehicle', myVehicleRoutes);
app.use('/api/serviceBooking', serviceBookingRoutes);
app.use('/api/serviceTracking', serviceTrackingRoutes);
app.use("/api/estimateApproval", EstimateApprovalRoutes);

// Staff Routes
app.use('/api/inspectionReport', inspectionReportRoutes);
app.use('/api/assignedJob', assignedJobRoutes);


// ------------------------------------------------------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
	console.log(`Server running on port ${PORT}`)
);

// ------------------------------------------------------------------------------------------------------------------------