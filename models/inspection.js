const mongoose = require("mongoose");

const inspectionSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    issuesFound: [String],
    remarks: String,
    beforeImages: [String],
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" }

module.exports = mongoose.model("Inspection", inspectionSchema);
