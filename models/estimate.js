const mongoose = require("mongoose");

const estimateSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    labourCharge: Number,
    partsCost: Number,
    tax: Number,
    totalAmount: Number,
    approvalStatus: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("Estimate", estimateSchema);

