const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    priority: { type: String, enum: ["Normal", "Urgent"], default: "Normal" },
    jobStatus: {
        type: String,
        enum: ["Assigned", "Inspection", "Waiting Approval", "Working", "Completed", "Ready Delivery"],
        default: "Assigned"
    },
    startTime: Date,
    endTime: Date
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);
