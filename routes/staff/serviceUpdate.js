const express = require("express");
const router = express.Router();

const Estimate = require("../../models/estimate");
const Job = require("../../models/job");
const UserModel = require("../../models/user");

// ============================================
// GET JOBS BY STATUS
// /api/waitingApproval/approvalQueue?status=Working
// ============================================
router.get("/jobs", async (req, res) => {
    try {
        // Capture status from query params, default to "Working" if not provided
        console.log("hello")
        const { status } = req.query;
        
        // Allowed statuses to prevent unauthorized queries
        const validStatuses = ["Working", "Completed", "Ready Delivery"];
        const queryStatus = validStatuses.includes(status) ? status : "Working";

        const jobs = await Job.find({
            jobStatus: queryStatus
        })
        .populate({
            path: "booking",
            populate: [
                {
                    path: "vehicle",
                    select: "vehicleNumber brand model"
                },
                {
                    path: "customer",
                    select: "name phone"
                }
            ]
        })
        .sort({ createdAt: -1 });

        res.json(jobs);

    } catch (err) {
        console.log("Error fetching service queue:", err);
        res.status(500).json({
            message: "Failed to fetch service management queue"
        });
    }
});

module.exports = router;