const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice"
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    serviceQuality: {
        type: Number,
        min: 1,
        max: 5
    },
    staffBehavior: {
        type: Number,
        min: 1,
        max: 5
    },
    timeliness: {
        type: Number,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true
    },
    recommend: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);