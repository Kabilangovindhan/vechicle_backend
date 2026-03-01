const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // ✅ IMPORTANT (You forgot this)

const Feedback = require("../../models/feedback");
const Job = require("../../models/job");
const User = require("../../models/user");
const Vehicle = require("../../models/vehicle");



// =======================================
// ADMIN - GET ALL FEEDBACK
// =======================================
router.get("/admin/all", async (req, res) => {
    console.log("Admin Feedback Request Received");
    try {

        const feedbacks = await Feedback.find()
            .populate("customer", "name phone")
            .populate({
                path: "job",
                populate: [
                    {
                        path: "assignedStaff",
                        model: "User",
                        select: "name phone"
                    },
                    {
                        path: "booking",
                        populate: {
                            path: "vehicle",
                            select: "vehicleNumber brand model"
                        }
                    }
                ]
            })
            .sort({ createdAt: -1 });

        res.json(feedbacks);

    } catch (error) {
        console.error("Admin Feedback Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
module.exports = router;