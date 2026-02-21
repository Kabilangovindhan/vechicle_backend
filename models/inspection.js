const mongoose = require("mongoose");

const inspectionSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    issuesFound: [
        { title: String, description: String }
    ],
    remarks: String,
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("Inspection", inspectionSchema);