const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    estimate: { type: mongoose.Schema.Types.ObjectId, ref: "Estimate" },
    gst: Number,
    grandTotal: Number,
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid"],
        default: "Pending"
    },
    paymentMethod: {
        type: String,
        enum: ["Cash", "Card", "UPI"]
    }
}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
