const express = require("express");
const router = express.Router();
const VehicleModel = require("../../models/vehicle");
const UserModel = require("../../models/user");
const BookingModel = require("../../models/booking");

// ------------------------------------------------------------------------------------------------------------------------

// Get all bookings

router.get("/:phone", async (req, res) => {

    try {

        const user = await UserModel.findOne({ phone: req.params.phone });
        if (!user) return res.json([]);
        const vehicles = await VehicleModel.find({ userId: user._id });
        res.json(vehicles);

    } catch (err) {
        console.log("Booking Fetch Error:", err);
        res.status(500).json([]);
    }
})

// ------------------------------------------------------------------------------------------------------------------------

// Service booking

router.post("/createBooking", async (req, res) => {

    try {

        const user = await UserModel.findOne({ phone: req.body.customerPhone });
        if (!user) return res.status(404).json({ message: "User not found" });

        const booking = new BookingModel({
            customer: user._id, vehicle: req.body.vehicle,
            serviceType: req.body.serviceType,
            appointmentDate: req.body.appointmentDate,
            problemDescription: req.body.problemDescription
        });

        await booking.save();
        res.json({ message: "Booking created successfully" });

    } catch (err) {
        console.log("BOOKING ERROR:", err);
        res.status(500).json({ message: err.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;