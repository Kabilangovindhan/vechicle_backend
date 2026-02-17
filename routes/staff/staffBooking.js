const express = require("express");
const router = express.Router();
const BookingModel = require("../../models/booking");




router.get("/fetchbook",  async (req, res) => {

    try {

        const bookings = await BookingModel
            .find({ status: "Pending" })
            .populate("customer")
            .populate("vehicle")
            .sort({ createdAt: -1 });

        res.json(bookings);

    } catch (err) {

        res.status(500).json({ message: "Fetch failed" });

    }

});


router.put("/rejectbook/:id",  async (req, res) => {

    try {

        const booking = await BookingModel.findByIdAndUpdate(
            req.params.id,
            { status: "Rejected" },
            { new: true }
        );

        res.json({
            message: "Booking rejected",
            booking
        });

    } catch (err) {

        res.status(500).json({ message: "Reject failed" });

    }

});

module.exports = router;