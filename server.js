const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// ------------------------------------------------------------------------------------------------------------------------

// Admin Routes
const customerManagementRoutes = require("./routes/admin/customerManagement");
const jobAssignmentRoutes = require("./routes/admin/jobAssignment");
const jobControlCenterRoutes = require("./routes/admin/jobControlCenter");
const inspectionEstimationReportRoutes = require("./routes/admin/inspectionEstimationReport");
const billingInvoiceRoutes = require("./routes/admin/billingInvoice");
const adminprofileRoutes =require("./routes/admin/adminProfile");

// Common Routes
const authenticationRoutes = require("./routes/common/authentication");

// Customer Routes
const myVehicleRoutes = require("./routes/customer/myVehicle");
const serviceTrackingRoutes = require("./routes/customer/serviceTracking");
const serviceBookingRoutes = require("./routes/customer/serviceBooking");
const EstimateApprovalRoutes = require("./routes/customer/estimateAppproval");
const customerProfileRoutes = require("./routes/customer/customerProfile");
const customerBillInvoiceRoutes = require("./routes/customer/customerBillInvoice");

// Staff Routes
const inspectionReportRoutes = require("./routes/staff/inspectionReport");
const assignedJobRoutes = require("./routes/staff/assignedJob");
const approvalQueueRoutes = require("./routes/staff/approvalQueue");
const serviceUpdateRoutes = require("./routes/staff/serviceUpdate");
const staffProfileRoutes =require("./routes/staff/staffProfile");

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
app.use('/api/jobControlCenter', jobControlCenterRoutes);
app.use('/api/inspectionestimateReport', inspectionEstimationReportRoutes);
app.use('/api/adminBillingInvoice', billingInvoiceRoutes);
app.use('/api/AdminProfile',adminprofileRoutes)

// Common Routes
app.use('/api/authentication', authenticationRoutes);

// Customer Routes
app.use('/api/myVehicle', myVehicleRoutes);
app.use('/api/serviceBooking', serviceBookingRoutes);
app.use('/api/serviceTracking', serviceTrackingRoutes);
app.use("/api/estimateApproval", EstimateApprovalRoutes);
app.use("/api/CustomerProfile", customerProfileRoutes);
app.use("/api/customerInvoice", customerBillInvoiceRoutes);
	
// Staff Routes
app.use('/api/inspectionReport', inspectionReportRoutes);
app.use('/api/assignedJob', assignedJobRoutes);
app.use('/api/approvalQueue', approvalQueueRoutes);
app.use('/api/serviceUpdate',serviceUpdateRoutes);
app.use("/api/StaffProfile",staffProfileRoutes)


// ------------------------------------------------------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
	console.log(`Server running on port ${PORT}`)
);

// ------------------------------------------------------------------------------------------------------------------------