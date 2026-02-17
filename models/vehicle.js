const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    ownerName: { type: String, required: true },
    ownerPhone: { type: String, required: true },
    ownerEmail: { type: String },
    vehicleNumber: { type: String, required: true, unique: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    variant: { type: String },
    fuelType: { type: String, enum: ["Petrol", "Diesel", "Electric", "Hybrid"] },
    transmission: { type: String, enum: ["Manual", "Automatic"] },
    chassisNumber: { type: String },
    engineNumber: { type: String },
    color: { type: String },
    year: { type: Number },
    lastServiceDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);