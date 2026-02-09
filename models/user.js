const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    // name: String,
    // email: String,
    // role: String,
    // status: String


    ownerName: {
        type: String,
        required: true
    },

    ownerPhone: {
        type: String,
        required: true
    },

    ownerEmail: {
        type: String
    },

    /* ===== VEHICLE BASIC DETAILS ===== */
    vehicleNumber: {
        type: String,
        required: true,
        unique: true
    },

    brand: {
        type: String,
        required: true
    },

    model: {
        type: String,
        required: true
    },

    variant: {
        type: String
    },

    fuelType: {
        type: String,
        enum: ["Petrol", "Diesel", "Electric", "Hybrid"]
    },

    transmission: {
        type: String,
        enum: ["Manual", "Automatic"]
    },

    /* ===== IDENTIFICATION ===== */
    chassisNumber: String,
    engineNumber: String,

    /* ===== PHYSICAL DETAILS ===== */
    color: String,
    year: Number,

    /* ===== SERVICE DETAILS ===== */
    lastServiceDate: Date,
});

module.exports = mongoose.model("User", userSchema);


