const mongoose = require("mongoose");

const estimateSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    items: [
        {
            issueTitle: String,
            description: String,
            labourCharge: Number,
            partsCost: Number,
            total: Number
        }
    ],
    tax: Number,
    grandTotal: Number,
    approvalStatus: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("Estimate", estimateSchema);