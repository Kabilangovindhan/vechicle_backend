const mongoose = require("mongoose");

const jobPartSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    part: { type: mongoose.Schema.Types.ObjectId, ref: "SparePart" },
    quantity: Number,
    price: Number
}, { timestamps: true });

module.exports = mongoose.model("JobPart", jobPartSchema);
