const express = require("express");
const router = express.Router();
const Job = require("../../models/job");

// ============================================
// GET JOBS BY STATUS
// /api/waitingApproval/approvalQueue?status=Working
// ============================================
router.get("/jobs", async (req, res) => {
    try {
        // Capture status from query params, default to "Working" if not provided
        // console.log("hello")
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
        console.log(jobs)
        res.json(jobs);

    } catch (err) {
        console.log("Error fetching service queue:", err);
        res.status(500).json({
            message: "Failed to fetch service management queue"
        });
    }
});


// ============================================
// UPDATE JOB STATUS (Next Step)
// ============================================
router.put("/jobs/:id/next", async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Status flow logic
        if (job.jobStatus === "Working") {
            job.jobStatus = "Completed";
            job.endTime = new Date();
        } 
        else if (job.jobStatus === "Completed") {
            job.jobStatus = "Ready Delivery";
        } 
        else if (job.jobStatus === "Ready Delivery") {
            // NEW LOGIC: Move to a final status so it disappears from Service Update 
            // and appears in the Billing system
            job.jobStatus = "Pending Billing"; 
        } 
        else {
            return res.status(400).json({
                message: "No further status available or job already billed"
            });
        }

        await job.save();

        res.json({
            message: "Job moved to Billing Queue successfully",
            job
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Failed to update job status" });
    }
});
module.exports = router;