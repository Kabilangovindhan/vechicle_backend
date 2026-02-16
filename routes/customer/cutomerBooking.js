const express = require("express");
const router = express.Router();
const BookingModel = require("../../models/booking");

// Get ALL bookings (Admin)
router.get("/Appointmentbook", async (req, res) => {

    try {

        const bookings = await BookingModel
            .find()
            .populate("customer")
            .populate("vehicle")
            .sort({ createdAt: -1 });

        res.json(bookings);

    } catch (err) {

        console.log(err);
        res.status(500).json({ message: "Failed to fetch bookings" });

    }

});

module.exports = router;