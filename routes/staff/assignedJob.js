const express = require("express");
const router = express.Router();

const Estimate = require("../models/estimate");
const Job = require("../models/Job");


// ==========================================
// SAVE ESTIMATE
// POST /api/jobManagement/estimate/:jobId
// ==========================================
router.post("/estimate/:jobId", async (req, res) => {
    console.log("hello"); // Debug log
    try {
        const { jobId } = req.params;
        const { items, tax, grandTotal } = req.body;

        // Validate
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Estimate items are required"
            });
        }

        // Check job exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // Optional: Delete old estimate if exists
        await Estimate.findOneAndDelete({ job: jobId });

        // Create new estimate
        const estimate = new Estimate({
            job: jobId,
            items,
            tax,
            grandTotal,
            approvalStatus: "Pending"
        });

        await estimate.save();

        // Update job status (optional but recommended)
        job.jobStatus = "Waiting Approval";
        await job.save();

        res.status(201).json({
            success: true,
            message: "Estimate saved successfully",
            data: estimate
        });

    } catch (error) {
        console.error("Error saving estimate:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;