const express = require("express");
const router = express.Router();
const UserModel = require("../../models/user");
const BookingModel = require("../../models/booking");

// ------------------------------------------------------------------------------------------------------------------------

// Get staff details for admin to assign a job

router.get("/staff", async (req, res) => {

    try {

        const staff = await UserModel.find({ role: "staff" }).select("_id name phone");
        res.json(staff);
    } catch (err) {
        console.log('Error in fetching staff name : ', err)
        res.status(500).json({
            message: "Failed to fetch staff"
        });

    }
});

// ------------------------------------------------------------------------------------------------------------------------

// For all booking for admin menu and also assing staff to a job who is unassingned

router.get("/fetchbooking", async (req, res) => {

    try {

        const booking = await BookingModel.find()
            .populate("customer", "name phone email")   
            .populate("vehicle", "vehicleNumber brand model");
        res.json(booking);

    } catch (err) {
        console.log('Error in fetching staff name : ', err)
        res.status(500).json({ message: "Failed to fetch staff" });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// Update booking status

router.put("/update/:id", async (req, res) => {

    try {

        const { status } = req.body;

        const updated = await BookingModel.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        res.json(updated);

    } catch (err) {

        console.log(err);
        res.status(500).json({ message: "Failed to update status" });

    }

});

// ------------------------------------------------------------------------------------------------------------------------

// Admin approve booking and assign staff

router.put("/approvebooking/:id/approve", async (req, res) => {

    try {

        const bookingId = req.params.id;
        const { mechanicId, priority } = req.body;

        // 1. Update booking status
        const booking = await BookingModel.findByIdAndUpdate(
            bookingId,
            { status: "Approved" },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // 2. Create Job and assign mechanic
        const job = await JobModel.create({
            booking: bookingId,
            assignedStaff: mechanicId,
            priority: priority || "Normal",
            jobStatus: "Assigned"
        });

        res.json({
            message: "Booking approved and job assigned",
            booking, job
        });

    } catch (err) {
        console.log('Error in approving booking : ', err);
        res.status(500).json({message: "Approval failed"});
    }
});

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;