const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    rating: { type: Number, min: 1, max: 5 },
    comment: String
}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
