const express = require("express");
const router = express.Router();
const Estimate = require("../../models/estimate");
const JobModel = require("../../models/job");
const UserModel = require("../../models/user");

// ------------------------------------------------------------------------------------------------------------------------

// Inspection

router.get("/fetch/:phone", async (req, res) => {

    try {

        const phone = req.params.phone;

        const staff = await UserModel.findOne({ phone });

        if (!staff)
            return res.status(404).json({ message: "Staff not found" });

        const jobs = await JobModel.find({ assignedStaff: staff._id, jobStatus: { $in: ["Assigned", "Inspection"] } })
            .populate({
                path: "booking",
                populate: [
                    { path: "vehicle", select: "vehicleNumber brand model" },
                    { path: "customer", select: "name phone" }
                ]
            })
            .sort({ createdAt: -1 });

        res.json(jobs);

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Failed to fetch assigned jobs"
        });

    }

});

// ------------------------------------------------------------------------------------------------------------------------

// Save Estimate

router.post("/estimate/:jobId", async (req, res) => {

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
        const job = await JobModel.findById(jobId);
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

        // Update job status
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

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;