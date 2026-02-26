const express = require("express");
const router = express.Router();

const User = require("../../models/user");
const Booking = require("../../models/booking");
const Job = require("../../models/job");
const Estimate = require("../../models/estimate");

// GET Ready Delivery Jobs for Customer
router.get("/fetch/:phone", async (req, res) => {
    // console.log("hello")

    try {

        const user = await User.findOne({ phone: req.params.phone });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const jobs = await Job.find({ jobStatus: "Ready Delivery" })
            .populate({
                path: "booking",
                match: { customer: user._id },
                populate: {
                    path: "vehicle",
                    select: "vehicleNumber brand model"
                }
            })
            .populate("assignedStaff", "name")
            .sort({ createdAt: -1 });

        const filtered = jobs.filter(j => j.booking);

        const result = await Promise.all(
            filtered.map(async (job) => {

                const estimate = await Estimate.findOne({
                    job: job._id,
                    approvalStatus: "Approved"
                });

                return {
                    job,
                    estimate
                };
            })
        );

        res.json(result);

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;