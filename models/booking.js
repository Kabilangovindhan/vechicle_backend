const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    serviceType: {
        type: String,
        enum: ["General Service", "Repair", "Oil Change", "Water Wash", "Inspection", "Other"],
        required: true
    },
    problemDescription: String,
    appointmentDate: Date,
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "In Progress", "Completed", "Delivered"],
        default: "Pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
